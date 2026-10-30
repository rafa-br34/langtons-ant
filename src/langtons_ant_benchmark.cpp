#include "common.h"

#include <chrono>
#include <cstdio>
#include <iomanip>
#include <iostream>
#include <limits>
#include <string>
#include <vector>

#if defined(_MSC_VER)
	#include <intrin.h>
#endif

#include <glm/ext/vector_int2_sized.hpp>

#include "configs.h"
#include "types/simulation_state.h"
#include "types/ant.h"


struct BenchmarkCase {
	std::string label;
	glm::i64vec2 grid_size;
	std::vector<Ant> template_ants;

	size_t iteration_limit;
	bool wrap = false;
	size_t run_count = 3;
};

struct RunResult {
	double seconds = 0.0;
	uint64_t cycles = 0;
	size_t iterations = 0;
	uint64_t checksum = 0;
};

uint64_t read_timestamp_counter() {
#if defined(_MSC_VER)
	_mm_lfence();
	uint64_t cycles = __rdtsc();
	_mm_lfence();
	return cycles;
#elif defined(__GNUC__)
	unsigned int lo, hi;
	__asm__ volatile("lfence; rdtsc" : "=a"(lo), "=d"(hi)::"memory");
	return ((uint64_t)hi << 32) | lo;
#else
	#error "Didn't find a viable high resolution monotonic counter"
	return 0;
#endif
}

size_t grid_index(const glm::i64vec2& grid_size, SizeType x, SizeType y) {
	return FLATTEN_2D(x, y, grid_size.x);
}

// FNV-1a
uint64_t state_checksum(const SimulationState& simulation) {
	uint64_t checksum = 0xCBF29CE484222325ull;

	for (SizeType y = 0; y < simulation.canvas_size.y; y++) {
		for (SizeType x = 0; x < simulation.canvas_size.x; x++) {
			checksum ^= simulation.canvas_pointer[grid_index(simulation.canvas_size, x, y)];
			checksum *= 0x100000001B3ull;
		}
	}

	return checksum;
}

RunResult time_simulation(const BenchmarkCase& benchmark_case) {
	SimulationState simulation = {};
	simulation.resize(benchmark_case.grid_size);

	for (const auto& ant : benchmark_case.template_ants)
		simulation.insert_ant(ant);

	simulation.reset();

	auto start_time = std::chrono::steady_clock::now();
	uint64_t start_cycles = read_timestamp_counter();

	size_t iterations = simulation.simulate(benchmark_case.iteration_limit);

	uint64_t end_cycles = read_timestamp_counter();
	auto end_time = std::chrono::steady_clock::now();

	return {
		std::chrono::duration<double>(end_time - start_time).count(),
		end_cycles - start_cycles,
		iterations,
		state_checksum(simulation)
	};
}

void run_benchmark(const BenchmarkCase& benchmark_case) {
	std::cout << "=== " << benchmark_case.label << " ===\n";
	std::cout << "Grid: " << benchmark_case.grid_size.x << 'x' << benchmark_case.grid_size.y
			  << "  Ants: " << benchmark_case.template_ants.size()
			  << "  Iteration limit: " << benchmark_case.iteration_limit
			  << "  Wrap: " << (benchmark_case.wrap ? "yes" : "no") << '\n';

	double total_seconds = 0.0;
	uint64_t total_cycles = 0;
	size_t total_iterations = 0;
	uint64_t first_checksum = 0;
	bool checksums_match = true;

	for (size_t run = 0; run < benchmark_case.run_count; run++) {
		auto [seconds, cycles, iterations, checksum] = time_simulation(benchmark_case);

		total_seconds += seconds;
		total_cycles += cycles;
		total_iterations += iterations;

		if (run == 0)
			first_checksum = checksum;
		else
			checksums_match = checksums_match && (checksum == first_checksum);

		char checksum_str[32];
		std::snprintf(checksum_str, sizeof(checksum_str), "0x%016llX", (unsigned long long)checksum);

		std::cout
			<< "  Run " << (run + 1) << ": " << iterations << " iterations in "
			<< std::fixed << std::setprecision(4) << seconds << "s, "
			<< std::setprecision(3) << (double(cycles) / 1E9) << "G cycles ("
			<< std::setprecision(2) << (double(iterations) / seconds / 1E6) << " M steps/s, "
			<< (double(cycles) / double(iterations)) << " cycles/step) checksum " << checksum_str << '\n';
	}

	if (!checksums_match)
		std::cout << "  ERROR: checksum mismatch between runs!\n";

	std::cout
		<< "  Mean: " << std::fixed << std::setprecision(4) << (total_seconds / double(benchmark_case.run_count)) << "s, "
		<< std::setprecision(3) << (double(total_cycles) / double(benchmark_case.run_count) / 1E9) << "G cycles ("
		<< std::setprecision(2) << (double(total_iterations) / total_seconds / 1E6) << "M steps/s, "
		<< (double(total_cycles) / double(total_iterations)) << " cycles/step, "
		<< (double(total_cycles) / total_seconds / 1E9) << "GHz)\n\n";
}

Ant make_ant(const glm::i64vec2& position, const std::string& fsm, bool wrap) {
	return Ant(position, glm::i8vec2(0, 1), Configs::parse_state_machine(fsm), wrap);
}


int main() {
	std::cout << "Langton's ant benchmark\n\n";

	// Single-ant path (SimulationState::simulate -> Ant::singlestep_update)
	{
		glm::i64vec2 grid_size(16384, 16384);
		auto center = grid_size / glm::i64vec2(2, 2);

		run_benchmark({"Single ant, RL (classic)", grid_size, {make_ant(center, "RL", true)}, 100'000'000ull, true});
		run_benchmark({"Single ant, RLR (chaotic)", grid_size, {make_ant(center, "RLR", true)}, 100'000'000ull, true});
		run_benchmark({"Single ant, LLRRRLRLRLLR (highway)", grid_size, {make_ant(center, "LLRRRLRLRLLR", true)}, 100'000'000ull, true});
	}

	// Multi-ant path (SimulationState::simulate -> Ant::doublestep_update_pos/cell)
	{
		glm::i64vec2 grid_size(8192, 8192);
		auto center = grid_size / glm::i64vec2(2, 2);

		std::vector<Ant> ants;
		for (int i = 0; i < 32; i++)
			ants.push_back(make_ant(center + glm::i64vec2(i * 16, i * 16), "RL", true));

		run_benchmark({"32 ants, RL (doublestep path)", grid_size, std::move(ants), 20'000'000ull, true});
	}

	// Bounded grid without wrapping: the ant walks off the edge and the simulation exits early
	{
		glm::i64vec2 grid_size(1024, 1024);
		auto center = grid_size / glm::i64vec2(2, 2);

		run_benchmark({"Single ant, RL, no wrap (bounded exit)", grid_size, {make_ant(center, "RL", false)}, std::numeric_limits<size_t>::max(), false});
	}
}
