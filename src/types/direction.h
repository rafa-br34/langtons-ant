#pragma once

#include <string_view>
#include <cstdint>
#include <span>
#include <string>

enum class DirectionEnum : int_fast8_t {
	R45 = 1,  // Right 45°
	R90 = 2,  // Right 90°
	R135 = 3, // Right 135°

	L45 = -1,  // Left 45°
	L90 = -2,  // Left 90°
	L135 = -3, // Left 135°

	U = 4, // U Turn
	C = 0, // Continue
	R = R90,
	L = L90,
};

// @note Add 3 before indexing
constexpr std::string_view DIRECTION_STRINGS[] = {
	"L135",
	"L",
	"L45",
	"C",
	"R45",
	"R",
	"R135",
	"U"
};

std::string directions_to_string(const std::span<DirectionEnum>& direction_list) {
	std::string result = {};

	for (auto direction : direction_list)
		result += DIRECTION_STRINGS[int8_t(direction) + 3];

	return result;
}