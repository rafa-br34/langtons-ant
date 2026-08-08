#pragma once
#include "../Common.h"

#include <algorithm>
#include <cstdint>
#include <cstring>
#include <vector>

#include <lodepng.h>
#include <glm/ext/vector_int2_sized.hpp>

#include "Ant.h"

class SimulationState {
private:
	void m_deallocate() {
		if (canvas_pointer != nullptr) {
			delete[] canvas_pointer;
			canvas_pointer = nullptr;
		}
	}

	void m_allocate() {
		if (canvas_pointer == nullptr)
			canvas_pointer = new CellType[canvas_size.x * canvas_size.y]{};
	}

public:
	std::vector<Ant> ant_templates;
	std::vector<Ant> ant_list;

	uint8_t* canvas_pointer = nullptr;
	glm::i64vec2 canvas_size = {0, 0};

	CellType possible_states = 0;

	void insert_ant(const Ant& ant_object) {
		ant_templates.push_back(ant_object);
		possible_states = std::max(possible_states, (CellType)ant_object.state_machine.size());
	}

	void update_stats() {
		possible_states = 0;

		for (auto& ant_object : ant_templates)
			possible_states = std::max(possible_states, (CellType)ant_object.state_machine.size());
	}

	void resize(const glm::i64vec2& size) {
		if (canvas_size != size)
			m_deallocate();

		canvas_size = size;
		m_allocate();
	}

	size_t simulate(size_t iteration_limit = 1) {
		if (ant_list.empty())
			return 0;

		size_t iterations = 0;

		if (ant_list.size() == 1) {
			for (; iterations < iteration_limit; iterations++) {
				if (!ant_list[0].singlestep_update(canvas_pointer, canvas_size)) {
					ant_list.clear();
					break;
				}
			}
		}
		else {
			for (; iterations < iteration_limit; iterations++) {
				// Update positions
				for (auto& ant_object : ant_list)
					ant_object.doublestep_update_pos(canvas_pointer, canvas_size);

				// Update cells & Remove dead ants
				ant_list.erase(
					std::remove_if(
						ant_list.begin(),
						ant_list.end(),
						[&](auto& ant_object) { return !ant_object.doublestep_update_cell(canvas_pointer, canvas_size); }
					),
					ant_list.end()
				);

				if (ant_list.empty())
					break;
			}
		}

		return iterations;
	}

	void reset(bool reset_canvas = true, bool reset_ants = true) {
		m_allocate();

		if (reset_canvas)
			std::memset(canvas_pointer, 0, canvas_size.x * canvas_size.y);

		if (reset_ants) {
			ant_list.clear();
			ant_list.insert(ant_list.end(), ant_templates.begin(), ant_templates.end());
		}
	}

	SimulationState() = default;
	SimulationState(const glm::i64vec2& size) { resize(size); }

	virtual ~SimulationState() { m_deallocate(); }
};
