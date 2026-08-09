#include "configs.h"
#include "common.h"
#include "types/simulation_state.h"
#include "Types/Ant.h"

#include <glm/ext/vector_int2_sized.hpp>

#include <chrono>
#include <iomanip>
#include <iostream>
#include <limits>
#include <string>
#include <vector>

namespace {
	struct BenchmarkCase {
		std::string label;
		glm::i64vec2 grid_size;
		std::vector<Ant> ants;  // Template ants to insert
		size_t iteration_limit; // Cap passed to SimulationState::simulate()
		bool wrap = false;      // Only used for reporting; the flag lives on each Ant
		size_t run_count = 3;
	};

	struct RunResult {
		double seconds = 0.0;
		size_t iterations = 0;
	};

	RunResult time_simulation(const BenchmarkCase& benchmark_case) {
		SimulationState simulation = {};
		simulation.resize(benchmark_case.grid_size);

		for (const auto& ant : benchmark_case.ants)
			simulation.insert_ant(ant);

		simulation.reset();

		auto start = std::chrono::steady_clock::now();
		size_t iterations = simulation.simulate(benchmark_case.iteration_limit);
		auto end = std::chrono::steady_clock::now();

		return {
			std::chrono::duration<double>(end - start).count(),
			iterations
		};
	}

	void run_benchmark(const BenchmarkCase& benchmark_case) {
		std::cout << "=== " << benchmark_case.label << " ===\n";
		std::cout << "Grid: " << benchmark_case.grid_size.x << 'x' << benchmark_case.grid_size.y
				  << "  Ants: " << benchmark_case.ants.size()
				  << "  Iteration limit: " << benchmark_case.iteration_limit
				  << "  Wrap: " << (benchmark_case.wrap ? "yes" : "no") << '\n';

		double total_seconds = 0.0;
		size_t total_iterations = 0;

		for (size_t run = 0; run < benchmark_case.run_count; run++) {
			auto [seconds, iterations] = time_simulation(benchmark_case);

			total_seconds += seconds;
			total_iterations += iterations;

			std::cout
				<< "  Run " << (run + 1) << ": " << iterations << " iterations in "
				<< std::fixed << std::setprecision(4) << seconds << " s ("
				<< std::setprecision(2) << (double(iterations) / seconds / 1e6) << " M steps/s)\n";
		}

		std::cout
			<< "  Mean: " << std::fixed << std::setprecision(4) << (total_seconds / double(benchmark_case.run_count)) << " s ("
			<< std::setprecision(2) << (double(total_iterations) / total_seconds / 1e6) << " M steps/s)\n\n";
	}

	Ant make_ant(const glm::i64vec2& position, const std::string& fsm, bool wrap) {
		return Ant(position, glm::i8vec2(0, 1), Configs::parse_state_machine(fsm), wrap);
	}

} // namespace

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
