#pragma once
#include "../Common.h"

#include <string_view>
#include <cstdint>
#include <vector>
#include <string>

#include <glm/ext/vector_int2_sized.hpp>

#include "Direction.h"


// Index after flattening
// 0 1 2
// 3 4 5
// 6 7 8
// Index to direction mapping
// 0 1 2
// 7 x 3
// 6 5 4

// clang-format off
constexpr int_fast8_t IDX_2_DIR[] = {
	-1, -1,
	 0, -1,
	 1, -1,
	 1,  0,
	 1,  1,
	 0,  1,
	-1,  1,
	-1,  0
};
constexpr int_fast8_t ROT_2_IDX[] = {
	0, 1, 2,
	7, 0, 3,
	6, 5, 4
};
// clang-format on

class Ant {
public:
	glm::i64vec2 position_prev = glm::i64vec2(0);
	glm::i64vec2 position_curr = glm::i64vec2(0);
	glm::i8vec2 direction = glm::i8vec2(0);

	SizeType step_length = 1;
	bool wrap = false;

	std::vector<DirectionEnum> state_machine;

	void rotate(int_fast8_t rotation) {
		// Decode direction vector and add 4 to ensure it's above zero
		int_fast8_t direction_index = (3 * direction.y + direction.x) + 4;

		// Finally add the rotation and mod 8
		direction_index = (ROT_2_IDX[direction_index] + rotation + 8) & 7;

		direction.x = IDX_2_DIR[direction_index * 2 + 0];
		direction.y = IDX_2_DIR[direction_index * 2 + 1];
	}

	bool validate_position(const glm::i64vec2& grid_size) const {
		return position_curr.x < grid_size.x && position_curr.y < grid_size.y && position_curr.x >= 0 && position_curr.y >= 0;
	}

	void wrap_position(const glm::i64vec2& grid_size) {
		if (position_curr.x >= grid_size.x)
			position_curr.x = 0;

		if (position_curr.y >= grid_size.y)
			position_curr.y = 0;

		if (position_curr.x < 0)
			position_curr.x = grid_size.x - 1;

		if (position_curr.y < 0)
			position_curr.y = grid_size.y - 1;
	}

	// Single step update (used for a single ant)
	bool singlestep_update(CellType* grid, const glm::i64vec2& grid_size) {
		if (!validate_position(grid_size))
			return false;

		CellType* cell = grid + FLATTEN_2D(position_curr.x, position_curr.y, grid_size.x);

		rotate((int8_t)state_machine[*cell % state_machine.size()]);
		position_curr += glm::i64vec2(direction) * step_length;

		*cell = (*cell + 1) % state_machine.size();

		if (wrap)
			wrap_position(grid_size);

		return true;
	}

	// Double step update (used for multiple ants)
	void doublestep_update_pos(const CellType* grid, const glm::i64vec2& grid_size) {
		CellType cell_state = grid[FLATTEN_2D(position_curr.x, position_curr.y, grid_size.x)];

		rotate((int8_t)state_machine[cell_state % state_machine.size()]);
		position_prev = position_curr;
		position_curr += glm::i64vec2(direction) * step_length;

		if (wrap)
			wrap_position(grid_size);
	}

	bool doublestep_update_cell(CellType* grid, const glm::i64vec2& grid_size) const {
		if (!validate_position(grid_size))
			return false;

		CellType* cell = grid + FLATTEN_2D(position_prev.x, position_prev.y, grid_size.x);
		*cell = (*cell + 1) % state_machine.size();

		return true;
	}

	Ant(SizeType x, SizeType y, int8_t dx, int8_t dy, std::vector<DirectionEnum> state_machine, bool wrap = false, SizeType step_size = 1)
		: position_curr(x, y), direction(dx, dy), step_length(step_size), wrap(wrap), state_machine(state_machine) {}

	Ant(glm::i64vec2 position, glm::i8vec2 direction, std::vector<DirectionEnum> state_machine, bool wrap = false, SizeType step_size = 1)
		: position_curr(position), direction(direction), step_length(step_size), wrap(wrap), state_machine(state_machine) {}

	Ant() = default;
};
