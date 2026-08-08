#pragma once
#include <string_view>
#include <optional>
#include <string>
#include <vector>
#include <chrono>
#include <array>
#include <regex>

#include <argparse/argparse.hpp>

#include "Types/Ant.h"


namespace Configs {
	enum class TimingType : uint8_t {
		ITERATION_BASED,
		TIME_BASED
	};

	struct Timing {
		TimingType type;

		union {
			size_t iter;
			double time;
		} value;

		void set_time(double time) {
			value.time = time;
			type = TimingType::TIME_BASED;
		}

		void set_iter(size_t iter) {
			value.iter = iter;
			type = TimingType::ITERATION_BASED;
		}
	};


	enum class ParserStatus : uint16_t {
		OK = 0,
		NO_MATCHES,
		INVALID_FORMAT,
		INVALID_VALUE,
		INVALID_FLAG
	};

	constexpr std::string_view PARSER_STATUS_NAMES[] = {
		"None",
		"No matches",
		"Invalid format",
		"Invalid value",
		"Invalid flag"
	};

	template<typename Type = ParserStatus>
	inline std::string_view error_str(Type value) {
		return PARSER_STATUS_NAMES[(int)value];
	}

	std::optional<size_t> character_index(char character, std::string_view dictionary) {
		auto iterator = std::find(dictionary.begin(), dictionary.end(), character);

		if (iterator != dictionary.end())
			return std::distance(dictionary.begin(), iterator);
		else
			return std::nullopt;
	}

	template<typename Duration>
	bool check_timing_done(const Timing& timing_obj, size_t curr_idx, const Duration& curr_time) {
		using namespace std::chrono;

		if (timing_obj.type == TimingType::ITERATION_BASED) {
			return curr_idx >= timing_obj.value.iter;
		}
		else if (timing_obj.type == TimingType::TIME_BASED) {
			return curr_time >= duration<double>(timing_obj.value.time);
		}
		else {
			return true;
		}
	}

	ParserStatus parse_timing(const std::string& timing_str, Timing* timing_obj) {
		std::smatch matches;

		const double multipliers_time[] = {
			1,    // s
			60,   // m
			3600, // h
			86400 // d
		};

		const size_t multipliers_iter[] = {
			1,         // i
			1000,      // k
			1000000,   // m
			1000000000 // b
		};

		if (!std::regex_match(timing_str, matches, std::regex("^(.)(\\d+)(.?)")))
			return ParserStatus::INVALID_FORMAT;

		auto multiplier = matches[3].str();
		auto value = (size_t)std::stoi(matches[2].str());
		auto type = matches[1].str();

		if (type == "i" || type == "I") {
			size_t multiplier_value = 1;

			if (!multiplier.empty()) {
				auto index = character_index(multiplier.at(0), "ikmb");

				if (index)
					multiplier_value = multipliers_iter[*index];
				else
					return ParserStatus::INVALID_FLAG;
			}

			timing_obj->set_iter(multiplier_value * value);
		}
		else if (type == "t" || type == "T") {
			double multiplier_value = 1.0;

			if (!multiplier.empty()) {
				auto index = character_index(multiplier.at(0), "smhd");

				if (index)
					multiplier_value = multipliers_time[*index];
				else
					return ParserStatus::INVALID_FLAG;
			}

			timing_obj->set_time(multiplier_value * value);
		}

		else
			return ParserStatus::INVALID_VALUE;

		return ParserStatus::OK;
	}

	std::vector<DirectionEnum> parse_state_machine(const std::string& fsm_str) {
		std::vector<DirectionEnum> result;

		int8_t direction = 0;
		size_t skip = 0;

		for (auto character : fsm_str) {
			if (direction != 0) {
				const uint8_t skip_size[] = {1, 1, 2};          // How many characters to skip
				auto index = character_index(character, "491"); // 45, 90, 135

				if (index) {
					result.push_back(DirectionEnum((*index + 1) * direction));
					skip += skip_size[*index];
				}

				// If skip is 0 then we didn't find anything to describe the angle, so presume R90/L90
				if (skip == 0)
					result.push_back(DirectionEnum(2 * direction));

				direction = 0; // Stop parsing direction
			}

			if (skip > 0) {
				skip--;
				continue;
			}

			// Parse command
			switch (character) {
				case 'R': // Prepare to parse right direction
					direction = 1;
					break;
				case 'L': // Prepare to parse left direction
					direction = -1;
					break;
				case 'U':
					result.push_back(DirectionEnum::U);
					break;
				case 'C':
					result.push_back(DirectionEnum::C);
					break;

				default:
					break;
			}
		}

		if (direction != 0)
			result.push_back(DirectionEnum(2 * direction));

		return result;
	}

	template<typename VectorType>
	ParserStatus parse_vec2(const std::string& vec2_str, VectorType* vec2_obj) {
		std::smatch matches;

		if (!std::regex_match(vec2_str, matches, std::regex(R"((-?\d+)\s*,\s*(-?\d+))")))
			return ParserStatus::INVALID_FORMAT;

		if (matches.size() != 3)
			return ParserStatus::INVALID_FORMAT;

		vec2_obj->x = (typename VectorType::value_type)std::stoi(matches[1].str());
		vec2_obj->y = (typename VectorType::value_type)std::stoi(matches[2].str());

		return ParserStatus::OK;
	}

	ParserStatus parse_flags(const std::string& flags_str, Ant& ant_obj) {
		for (auto flag : flags_str) {
			switch (flag) {
				case 'W':
					ant_obj.wrap = true;
					break;

				default:
					return ParserStatus::INVALID_FLAG;
			}
		}

		return ParserStatus::OK;
	}

	using StateMachines = std::vector<std::vector<DirectionEnum>>;

	ParserStatus parse_ant(const std::string& ant_str, const StateMachines& state_machines, Ant& ant_obj) {
		std::smatch matches;

		if (!std::regex_match(ant_str, matches, std::regex(R"((.)\(([\w\s,+-]*?)\))")))
			return ParserStatus::NO_MATCHES;

		if (matches.size() % 3 != 0)
			return ParserStatus::INVALID_FORMAT;

		for (size_t i = 0; i < matches.size(); i += 3) {
			const std::string& value = matches[i + 2].str();

			ParserStatus result = ParserStatus::OK;

			switch (matches[i + 1].str().at(0)) {
				case 'P': // Position
					result = parse_vec2(value, &ant_obj.position_curr);
					break;

				case 'D': // Direction
					result = parse_vec2(value, &ant_obj.direction);
					break;

				case 'F': // Flags
					result = parse_flags(value, ant_obj);
					break;

				case 'M': { // State machine
					if (std::regex_match(value, std::regex("\\d+"))) {
						auto index = (size_t)std::stoi(value);

						if (index + 1 >= state_machines.size())
							return ParserStatus::INVALID_FORMAT;

						ant_obj.state_machine = state_machines[index];
					}
					else // Is the state machine a list?
						ant_obj.state_machine = parse_state_machine(value);

					break;
				}

				case 'S': { // Step size
					if (std::regex_match(value, std::regex("\\d+")))
						ant_obj.step_length = std::stoi(value);
					else
						return ParserStatus::INVALID_FORMAT;

					break;
				}

				default:
					break;
			}

			if (result != ParserStatus::OK)
				return result;
		}

		return ParserStatus::OK;
	}

	ParserStatus parse_ants(std::string ant_list_str, const StateMachines& state_machines, std::vector<Ant>& ant_list) {
		size_t position = 0;

		while ((position = ant_list_str.find(';')) != std::string::npos) {
			Ant ant_obj;

			ParserStatus result = parse_ant(ant_list_str.substr(0, position), state_machines, ant_obj);

			if (result == ParserStatus::OK)
				ant_list.push_back(ant_obj);
			else
				return result;

			ant_list_str.erase(0, position + 1);
		}

		return ParserStatus::OK;
	}

	ParserStatus parse_state_machines(std::string fsm_list_str, StateMachines& state_machines) {
		size_t position = 0;

		while ((position = fsm_list_str.find(';')) != std::string::npos) {
			state_machines.push_back(parse_state_machine(fsm_list_str.substr(0, position)));
			fsm_list_str.erase(0, position + 1);
		}

		state_machines.push_back(parse_state_machine(fsm_list_str.substr(0, fsm_list_str.size())));

		return ParserStatus::OK;
	}
}