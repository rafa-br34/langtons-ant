#pragma once
#include "common.h"

#include <condition_variable>
#include <iostream>
#include <future>
#include <vector>
#include <string>
#include <thread>
#include <atomic>
#include <mutex>
#include <cmath>

#include <glm/ext/vector_int2_sized.hpp>
#include <lodepng.h>

#include "types/simulation_state.h"
#include "types/ant.h"

namespace Encoding {
	union RGBA32 {
		uint32_t color = 0;

		struct {
			uint8_t r, g, b, a;
		} rgba;

		operator uint32_t() const { return color; }
	};

	typedef RGBA32 (*ColorDescriptor)(size_t);

	class PaletteManager {
	private:
		std::vector<RGBA32> m_palette = {};
		ColorDescriptor m_last_procedure = nullptr;

	public:
		ColorDescriptor coloring_procedure = [](size_t index) -> RGBA32 {
			auto i = uint32_t(index);
			XOR_SHIFT32(i);
			i *= 0x9E3779B9;
			return {((i & 0x00FF0000) >> 16) | (i & 0x0000FF00) | ((i & 0x000000FF) << 16) | (i & 0xFF000000)};
		};

		void resize_palette(size_t state_count) {
			if (m_last_procedure != coloring_procedure) { // Reset the cache if the coloring procedure has changed
				m_last_procedure = coloring_procedure;
				m_palette.clear();
			}

			size_t cache_size = m_palette.size();
			if (state_count <= cache_size) {
				if (cache_size - state_count > cache_size * 2) // Resize the cache if it's more than 2x bigger
					m_palette.resize(state_count);

				return;
			}

			m_palette.reserve(state_count);
			for (size_t s = m_palette.size(); s < state_count; s++)
				m_palette.push_back(coloring_procedure(s));
		}

		size_t get_size() const {
			return m_palette.size();
		}

		RGBA32 get_color(size_t index) {
			if (index + 1 > m_palette.size())
				resize_palette(index + 1);

			return m_palette[index];
		}

		RGBA32* get_data() {
			return m_palette.data();
		}

		RGBA32 operator[](size_t index) {
			return m_palette[index];
		}
	};

	class ThreadManager {
	private:
		std::condition_variable m_threads_signal = {};
		std::atomic<size_t> m_threads_active = 0; // @todo std::atomic might not be required because of m_threads_lock and m_threads_signal
		std::mutex m_threads_lock = {};

	public:
		size_t thread_count = 0;

		void acquire_thread() {
			std::unique_lock<std::mutex> lock(m_threads_lock);
			while (thread_count > 0 && m_threads_active >= thread_count)
				m_threads_signal.wait(lock);

			m_threads_active++;
			DEBUG_PRINT("Acquired thread (%d active)\n", (int)m_threads_active);
		}

		void release_thread() {
			std::unique_lock<std::mutex> lock(m_threads_lock);
			m_threads_active--;
			m_threads_signal.notify_all();
			DEBUG_PRINT("Released thread (%d active)\n", (int)m_threads_active);
		}

		void wait_jobs() {
			std::unique_lock<std::mutex> lock(m_threads_lock);
			while (m_threads_active > 0)
				m_threads_signal.wait(lock);
		}

		size_t active_threads() const { return m_threads_active; }

		ThreadManager() = default;
		~ThreadManager() { wait_jobs(); }
	};

	enum class ImageFormat : uint8_t {
		PNG_PALETTE,
		PNG_GRAYSCALE,
	};

	class EncoderState {
	private:
		lodepng::State m_setup_encoder_state(size_t state_count, unsigned int bit_depth) {
			lodepng::State state = {};

			lodepng_state_init(&state);

			LodePNGColorType color_type;

			switch (format) {
				case ImageFormat::PNG_PALETTE:
					color_type = LCT_PALETTE;
					break;
				case ImageFormat::PNG_GRAYSCALE:
					color_type = LCT_GREY;
					break;

				default: {
					DEBUG_PRINT("Unknown data format %d, color_type will be set to LCT_GREY\n", (int)format);
					color_type = LCT_GREY;
					break;
				}
			}

			state.info_png.color.colortype = color_type;
			state.info_raw.colortype = color_type;

			state.info_png.color.bitdepth = bit_depth;
			state.info_raw.bitdepth = bit_depth;

			state.encoder.auto_convert = 0;

			if (format != ImageFormat::PNG_PALETTE) return state;

			DEBUG_PRINT("Setting up palette with %d colors (%d bits per pixel):\n", (int)state_count, (int)bit_depth);
			palette.resize_palette(state_count);
			for (size_t i = 0; i < state_count; i++) {
				auto [r, g, b, a] = palette[i].rgba;

				DEBUG_PRINT(" %lu: %06X\n", (long unsigned int)i, palette[i].color & 0x00FFFFFF);
				lodepng_palette_add(&state.info_png.color, r, g, b, 0xFF);
				lodepng_palette_add(&state.info_raw, r, g, b, 0xFF);
			}

			return state;
		}


		template<typename Function>
		void m_encode_buffer(const CellType* grid, const glm::i64vec2& size, size_t state_count, Function callback) {
			std::vector<uint8_t> image_data = {};
			lodepng::State state = m_setup_encoder_state(state_count, 8);

			unsigned int result = lodepng::encode(
				image_data,
				(const unsigned char*)grid,
				(unsigned int)size.x,
				(unsigned int)size.y,
				state
			);

			ASSERT_MSG(result == 0, "lodepng::encode -> %d\n", result);

			callback(image_data, glm::i64vec2(size.x, size.y), result);
		}

	public:
		PaletteManager palette = {};
		ThreadManager threads = {};

		ImageFormat format = ImageFormat::PNG_PALETTE;

		template<typename Function>
		void encode_sync(const SimulationState& state, Function callback) {
			m_encode_buffer(state.canvas_pointer, state.canvas_size, state.possible_states, callback);
		}

		template<typename Function>
		void encode_sync(const SimulationState& state, const glm::i64vec2& section_position, const glm::i64vec2& section_size, Function callback) {
			std::vector<CellType> section(section_size.x * section_size.y);

			for (SizeType y = 0; y < section_size.y; y++) {
				auto* row_start = state.canvas_pointer + FLATTEN_2D(section_position.x, section_position.y + y, state.canvas_size.x);

				std::copy(
					row_start,
					row_start + section_size.x,
					section.begin() + section_size.y * y
				);
			}

			return m_encode_buffer(section.data(), section_size, state.possible_states, callback);
		}

		template<typename Function>
		void encode_async(const SimulationState& state, Function callback) {
			auto grid_copy = std::make_shared<std::vector<CellType>>();
			auto grid_size = state.canvas_size;

			grid_copy->assign(state.canvas_pointer, state.canvas_pointer + grid_size.x * grid_size.y);

			threads.acquire_thread();
			std::thread([&, grid_copy, grid_size, states = state.possible_states, callback]() {
				m_encode_buffer(grid_copy->data(), grid_size, states, callback);
				threads.release_thread();
			}).detach();
		}

		template<typename Function>
		void encode_async(const SimulationState& state, const glm::i64vec2& section_position, const glm::i64vec2& section_size, Function callback) {
			auto section = std::make_shared<std::vector<CellType>>(section_size.x * section_size.y);

			for (SizeType y = 0; y < section_size.y; y++) {
				auto* row_start = state.canvas_pointer + FLATTEN_2D(section_position.x, section_position.y + y, state.canvas_size.x);

				std::copy(
					row_start,
					row_start + section_size.x,
					section->begin() + section_size.y * y
				);
			}

			threads.acquire_thread();
			std::thread([&, section, section_size, states = state.possible_states, callback]() {
				m_encode_buffer(section->data(), section_size, states, callback);
				threads.release_thread();
			}).detach();
		}

		EncoderState() = default;
		~EncoderState() { threads.wait_jobs(); }
	};
}
