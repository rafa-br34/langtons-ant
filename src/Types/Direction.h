#pragma once

#include <string_view>
#include <cstdint>
#include <vector>
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
constexpr std::string_view DirectionStrings[] = {
	"L135",
	"L",
	"L45",
	"C",
	"R45",
	"R",
	"R135",
	"U"
};

std::string DirectionsToString(const std::vector<DirectionEnum>& Directions) {
	std::string Result = {};

	for (auto Direction : Directions)
		Result += DirectionStrings[int8_t(Direction) + 3];

	return Result;
}