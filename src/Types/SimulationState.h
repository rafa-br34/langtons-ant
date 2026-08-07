#pragma once
#include "../Common.h"

#include <algorithm>
#include <cstdint>
#include <cstring>
#include <vector>

#include <lodepng.h>

#include "glm/ext/vector_int2_sized.hpp"
#include "Ant.h"

class SimulationState {
private:
	void m_Deallocate() {
		if (CanvasPointer) {
			delete[] CanvasPointer;
			CanvasPointer = nullptr;
		}
	}

	void m_Allocate() {
		if (!CanvasPointer)
			CanvasPointer = new CellType[CanvasSize.x * CanvasSize.y]{};
	}

public:
	std::vector<Ant> TemplateAnts = {};
	std::vector<Ant> Ants = {};

	uint8_t* CanvasPointer = nullptr;
	glm::i64vec2 CanvasSize = {0, 0};

	CellType PossibleStates = 0;

	void InsertAnt(const Ant& AntObject) {
		TemplateAnts.push_back(AntObject);
		PossibleStates = std::max(PossibleStates, (CellType)AntObject.state_machine.size());
	}

	void UpdateStats() {
		PossibleStates = 0;

		for (auto& AntObject : TemplateAnts)
			PossibleStates = std::max(PossibleStates, (CellType)AntObject.state_machine.size());
	}

	void Resize(const glm::i64vec2& Size) {
		if (CanvasSize != Size)
			m_Deallocate();

		CanvasSize = Size;
		m_Allocate();
	}

	size_t Simulate(size_t IterationLimit = 1) {
		if (Ants.empty())
			return 0;

		size_t Iterations = 0;

		if (Ants.size() == 1) {
			for (; Iterations < IterationLimit; Iterations++) {
				if (!Ants[0].singlestep_update(CanvasPointer, CanvasSize)) {
					Ants.clear();
					break;
				}
			}
		}
		else {
			for (; Iterations < IterationLimit; Iterations++) {
				// Update positions
				for (auto& AntObject : Ants)
					AntObject.doublestep_update_pos(CanvasPointer, CanvasSize);

				// Update cells & Remove dead ants
				Ants.erase(
					std::remove_if(
						Ants.begin(),
						Ants.end(),
						[&](auto& AntObject) { return !AntObject.doublestep_update_cell(CanvasPointer, CanvasSize); }
					),
					Ants.end()
				);

				if (Ants.empty())
					break;
			}
		}

		return Iterations;
	}

	void Reset(bool ResetCanvas = true, bool ResetAnts = true) {
		m_Allocate();

		if (ResetCanvas)
			std::memset(CanvasPointer, 0, CanvasSize.x * CanvasSize.y);

		if (ResetAnts) {
			Ants.clear();
			Ants.insert(Ants.end(), TemplateAnts.begin(), TemplateAnts.end());
		}
	}

	SimulationState() = default;
	SimulationState(const glm::i64vec2& Size) { Resize(Size); }

	virtual ~SimulationState() { m_Deallocate(); }
};
