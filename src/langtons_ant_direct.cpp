#include "encoding.h"
#include "configs.h"
#include "common.h"

#include <glm/ext/vector_int2_sized.hpp>

#include "types/simulation_state.h"
#include "types/ant.h"


#include <chrono>

int main() {
	/*
		Most known:
		RRLLLRLLLRRR Creates a filled triangle shape
		LLRRRLRLRLLR Creates a convoluted highway
		LRRRRRLLR  Fills space in a square around itself
		LLRR Grows symmetrically
		RLR Grows chaotically
		RL Default Langton's ant
		
		Others:
		RURLRU Expands chaotically quickly
		RLLLRLRRLLRRR Similar to LRRRRRLLR but slower and slows down growth considerably at iteration 8477782376

		L45R45 Expands very slowly
		L45UR45U Similar to L45R45, can be chained
		
		RLRRLRRLRRLR & RLC When initializing both ants at the center (+/- 1 pixel tolerance on the y axis) with the same direction a prism with complex patterns is made
	*/

	glm::i64vec2 canvas_size(65536 / 2, 65536 / 2);
	auto center = canvas_size / glm::i64vec2(2, 2);

	SimulationState simulation = {};
	Encoding::PaletteManager palette = {};
	Encoding::EncoderState encoder = {};

	simulation.resize(canvas_size);

	simulation.insert_ant(Ant(center, glm::i8vec2(0, 1), Configs::parse_state_machine("RLRRLRRLRRLR"), true));
	simulation.insert_ant(Ant(center, glm::i8vec2(0, 1), Configs::parse_state_machine("RLC"), true));

	simulation.reset();
	palette.resize_palette(simulation.possible_states);

	encoder.threads.thread_count = 1;
	encoder.format = Encoding::ImageFormat::PNG_PALETTE;

	// ffmpeg -r 60 -i "Frames/%d.png" -b:v 5M -c:v libx264 -preset veryslow -qp 0 output.mp4
	// ffmpeg -r 60 -i "Frames/%d.png" -b:v 5M -c:v libx264 -preset veryslow -qp 0 -s 1920x1920 output.mp4
	// ffmpeg -r 60 -i "Frames/%d.png" -b:v 5M -c:v libx264 -preset veryslow -qp 0 -s 1920x1920 -sws_flags neighbor output.mp4
	// ffmpeg -r 30 -i "Frames/%d.png" -c:v libx264 -preset veryslow -qp 0 -s 7680x4320 output.mp4
	// ./LangtonsAnt | ~/ffmpeg/ffmpeg -y -f rawvideo -pix_fmt rgb24 -s 30720x30720 -r 30 -i - -c:v libx264 -preset veryslow -s 7680x7680 output.h264
	// ./LangtonsAnt | ~/ffmpeg/ffmpeg -y -f rawvideo -pix_fmt rgb24 -s 1920x1920 -r 30 -i - -c:v libx264 -preset veryslow -s 1920x1920 output.h264

	std::cout << "State machines:\n";
	for (auto& ant : simulation.ant_templates)
		std::cout << '\t' << directions_to_string(ant.state_machine) << '\n';

	size_t Iterations = 64ull * 10000000ull;
	double FrameRate = 64.0; // Video frame rate
	double Time = 1.0;       // Video time
	size_t Frames = size_t(Time * FrameRate);

	size_t CaptureDelta = size_t(double(Iterations) / double(Frames));

	std::chrono::steady_clock::time_point StartTime = {};

	for (size_t i = 0; i < Frames; i++) {
		StartTime = std::chrono::high_resolution_clock::now();
		size_t Result = simulation.simulate(CaptureDelta);

		std::cout
			<< "Frame: " << i
			<< " Iters: " << Result << '/' << CaptureDelta
			<< " Active threads: " << encoder.threads.active_threads()
			<< " Time taken: " << std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::high_resolution_clock::now() - StartTime)
			<< '\n';

		/*
		Encoder.encode_async(simulation, [&, i](const std::vector<uint8_t>& image_data, const glm::i64vec2&, unsigned int) {
			lodepng::save_file(image_data, "frames/" + std::to_string(i) + ".png");
		});
		//*/
		/*
		Encoder.EncodeSync(simulation, [&, i](const std::vector<uint8_t>& image_data, const glm::i64vec2&, unsigned int) {
			lodepng::save_file(image_data, "frames/" + std::to_string(i) + ".png");
		});
		//*/
	}

	encoder.encode_sync(simulation, [&](const std::vector<uint8_t>& image_data, const glm::i64vec2&, unsigned int) {
		lodepng::save_file(image_data, "frames/" + std::to_string(-1) + ".png");
	});
}