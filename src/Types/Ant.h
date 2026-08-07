#pragma once
#include "../Common.h"

#include <string_view>
#include <cstdint>
#include <vector>
#include <string>

#include "glm/vec2.hpp"

#include "Direction.h"
#include "Vector.h"


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
	Vector2<SizeType> position_prev = {};
	Vector2<SizeType> position_curr = {};
	Vector2<int_fast8_t> direction = {};

	SizeType step_length = 1;
	bool wrap = false;

	std::vector<DirectionEnum> state_machine;

	void rotate(int_fast8_t rotation) {
		// Decode direction vector and add 4 to ensure it's above zero
		int_fast8_t direction_index = (3 * direction.Y + direction.X) + 4;

		// Finally add the rotation and mod 8
		direction_index = (ROT_2_IDX[direction_index] + rotation + 8) & 7;

		direction.X = IDX_2_DIR[direction_index * 2 + 0];
		direction.Y = IDX_2_DIR[direction_index * 2 + 1];
	}

	bool validate_position(const Vector2<SizeType>& grid_size) const {
		return position_curr.X < grid_size.X && position_curr.Y < grid_size.Y && position_curr.X >= 0 && position_curr.Y >= 0;
	}

	void wrap_position(const Vector2<SizeType>& grid_size) {
		if (position_curr.X >= grid_size.X)
			position_curr.X = 0;

		if (position_curr.Y >= grid_size.Y)
			position_curr.Y = 0;

		if (position_curr.X < 0)
			position_curr.X = grid_size.X - 1;

		if (position_curr.Y < 0)
			position_curr.Y = grid_size.Y - 1;
	}

	// Single step update (used for a single ant)
	bool singlestep_update(CellType* grid, const Vector2<SizeType>& grid_size) {
		if (!validate_position(grid_size))
			return false;

		CellType* cell = grid + FLATTEN_2D(position_curr.X, position_curr.Y, grid_size.X);

		rotate((int8_t)state_machine[*cell % state_machine.size()]);
		position_curr += direction * step_length;

		*cell = (*cell + 1) % state_machine.size();

		if (wrap)
			wrap_position(grid_size);

		return true;
	}

	// Double step update (used for multiple ants)
	void doublestep_update_pos(const CellType* grid, const Vector2<SizeType>& grid_size) {
		CellType cell_state = grid[FLATTEN_2D(position_curr.X, position_curr.Y, grid_size.X)];

		rotate((int8_t)state_machine[cell_state % state_machine.size()]);
		position_prev = position_curr;
		position_curr += direction * step_length;

		if (wrap)
			wrap_position(grid_size);
	}

	bool doublestep_update_cell(CellType* grid, const Vector2<SizeType>& grid_size) const {
		if (!validate_position(grid_size))
			return false;

		CellType* cell = grid + FLATTEN_2D(position_prev.X, position_prev.Y, grid_size.X);
		*cell = (*cell + 1) % state_machine.size();

		return true;
	}

	Ant(SizeType x, SizeType y, int8_t dx, int8_t dy, std::vector<DirectionEnum> state_machine, bool wrap = false, SizeType step_size = 1)
		: position_curr(x, y), direction(dx, dy), step_length(step_size), wrap(wrap), state_machine(state_machine) {}

	Ant(Vector2<SizeType> position, Vector2<int8_t> direction, std::vector<DirectionEnum> state_machine, bool wrap = false, SizeType step_size = 1)
		: position_curr(position), direction(direction), step_length(step_size), wrap(wrap), state_machine(state_machine) {}

	Ant() = default;
};