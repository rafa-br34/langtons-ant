#include <algorithm>
#include <iostream>
#include <iomanip>
#include <numeric>
#include <fstream>
#include <string>
#include <thread>
#include <atomic>
#include <chrono>
#include <mutex>
#include <map>

#include <array>

#include <argparse/argparse.hpp>

#include "Encoding.h"
#include "Configs.h"
#include "Common.h"

#include "Types/SimulationState.h"
#include "Types/Ant.h"


void setup_arguments(argparse::ArgumentParser& parser) {
	parser.add_description("Efficient modular implementation of Langton's ant universal Turing machine.");

	parser.add_argument("-x")
		.default_value<SizeType>(1000)
		.help("Canvas width");

	parser.add_argument("-y")
		.default_value<SizeType>(1000)
		.help("Canvas height");

	parser.add_argument("-m")
		.default_value(std::vector<std::string>{"LRRRRRLLR"})
		.append()
		.help("Defines a state machine. Supports R45/L45, R90/L90 (can also be written as L/R), R135/L135, U (U turn), and C (Continue).");

	parser.add_argument("-a")
		.default_value(std::vector<std::string>{"P(500,500)D(0,-1)M(LR)"})
		.append()
		.help("Defines a ant, format: \"P(X,Y)D(DX,DY)M(<fsm_idx|fsm_instructions>)S(S)F(W?)\" can be chained using ';'");

	parser.add_argument("-s")
		.default_value<size_t>(1000)
		.help("Defines when to take canvas snapshots");

	parser.add_argument("-t")
		.default_value<size_t>(1)
		.help("Defines how many encoding threads");

	parser.add_argument("-i")
		.default_value("i5000")
		.help("Defines how many iterations should be evaluated, i50b runs for 50b iterations, t50s runs for 50 seconds.");

	parser.add_argument("-o")
		.default_value("frame-%d.png")
		.help("Defines how to output frames");

	parser.add_argument("-f")
		.default_value("pal")
		.help("Defines the output format, available values: pal (palette) or idx (index/grayscale)");
}

int main(int argc, const char* argv[]) {
	argparse::ArgumentParser argument_parser("Langton's ant");

	setup_arguments(argument_parser);

	try {
		argument_parser.parse_args(argc, argv);
	}
	catch (const std::exception& error) {
		std::cerr << error.what() << std::endl;
		std::cerr << argument_parser;

		return 1;
	}

	SimulationState simulation = {};

	std::printf(
		"Setting canvas size to %lli, %lli\n",
		argument_parser.get<SizeType>("-x"),
		argument_parser.get<SizeType>("-y")
	);

	simulation.resize({
		argument_parser.get<SizeType>("-x"),
		argument_parser.get<SizeType>("-y"),
	});

	std::vector<std::vector<DirectionEnum>> fsm_list = {};

	Configs::ParserStatus result = Configs::ParserStatus::OK;

	for (auto& fsm_string : argument_parser.get<std::vector<std::string>>("-m")) {
		result = Configs::parse_state_machines(
			fsm_string,
			fsm_list
		);

		if (result != Configs::ParserStatus::OK) {
			std::cerr << "Failed to parse state machine \"" << fsm_string << "\" with status " << Configs::error_str(result) << '\n';
			return 1;
		}
	}

	std::printf("State Machines:\n");
	for (auto& fsm : fsm_list)
		std::printf("\t%s\n", directions_to_string(fsm).c_str());

	for (auto& fsm_string : argument_parser.get<std::vector<std::string>>("-a")) {
		result = Configs::parse_ants(
			fsm_string,
			fsm_list,
			simulation.ant_templates
		);

		if (result != Configs::ParserStatus::OK) {
			std::cerr << "Failed to parse ant \"" << fsm_string << "\" with status " << Configs::error_str(result) << '\n';
			return 1;
		}
	}

	Encoding::PaletteManager palette = {};
	Encoding::EncoderState encoder = {};

	palette.resize_palette(simulation.possible_states);

	encoder.threads.thread_count = 1;
	encoder.format = Encoding::ImageFormat::PNG_PALETTE;

	Configs::Timing eval_condition = {};

	size_t save_iters = argument_parser.get<size_t>("-s");

	result = Configs::parse_timing(argument_parser.get<std::string>("-i"), &eval_condition);

	if (result != Configs::ParserStatus::OK) {
		std::cerr << "Failed to parse evaluation condition with status " << Configs::error_str(result) << '\n';
		return 1;
	}

	simulation.reset();

	size_t curr_iter = 0;

	auto time_start = std::chrono::high_resolution_clock::now();

	while (true) {
		auto time_now = std::chrono::high_resolution_clock::now();
		auto curr_time = time_now - time_start;

		if (Configs::check_timing_done(eval_condition, curr_iter, curr_time))
			break;

		simulation.simulate(save_iters);
		curr_iter += save_iters;

		std::cout
			<< "Iters: " << curr_iter << " Each " << save_iters
			<< " Active threads: " << encoder.threads.active_threads()
			<< " Time taken: " << std::chrono::duration_cast<std::chrono::milliseconds>(curr_time)
			<< '\n';

		encoder.encode_sync(simulation, [&](const std::vector<uint8_t>& image_data, const glm::i64vec2&, unsigned int) {
			lodepng::save_file(image_data, "frames/" + std::to_string(-1) + ".png");
		});
	}
}