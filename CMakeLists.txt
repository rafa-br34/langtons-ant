cmake_minimum_required(VERSION 3.20)

project(
	LangtonsAnt
	DESCRIPTION "A simple project that simulates the Langton's ant universal Turing machine"
	HOMEPAGE_URL "https://github.com/rafa-br34/LangtonsAnt"
	LANGUAGES CXX
)

# Setup constants
if(NOT CMAKE_BUILD_TYPE)
	set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_GENERATOR_PLATFORM x64)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)


if(CMAKE_GENERATOR STREQUAL "Ninja" AND CMAKE_GENERATOR_PLATFORM STREQUAL "x64")
	set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -m64")
	set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -m64")
	unset(CMAKE_GENERATOR_PLATFORM)
endif()

include("cmake/lib_lodepng.cmake")
include("cmake/lib_tiff.cmake")
include("cmake/lib_argparse.cmake")
include("cmake/lib_glm.cmake")

if(MSVC)
	add_compile_options(/W4)
	add_compile_options(/permissive- /Zc:__cplusplus)
else()
	add_compile_options(-Wall -Wextra -Wpedantic)
endif()

if (CMAKE_CXX_COMPILER_ID MATCHES "Clang")
	add_compile_options(
		-Wno-c++11-narrowing
		-fms-extensions
		-fno-math-errno
		-mllvm -vectorize-loops
		-fvectorize
		-fslp-vectorize
	)
endif()

set(SRC_DIR ${CMAKE_SOURCE_DIR}/src)


add_executable(langtons_ant_interface src/langtons_ant_eval_cli.cpp ${COMMON_SOURCES})
target_link_libraries(
	langtons_ant_interface
	PRIVATE
	lib-glm
	lib-argparse
	lib-lodepng
	lib-tiff
)


add_executable(langtons_ant_direct src/langtons_ant_direct.cpp ${COMMON_SOURCES})
target_link_libraries(
	langtons_ant_direct
	PRIVATE
	lib-glm
	lib-argparse
	lib-lodepng
	lib-tiff
)

add_executable(langtons_ant_benchmark src/langtons_ant_benchmark.cpp)
target_link_libraries(
	langtons_ant_benchmark
	PRIVATE
	lib-glm
	lib-argparse
	lib-lodepng
	lib-tiff
)

add_custom_target(
	langtons_ant ALL DEPENDS
	langtons_ant_interface
	langtons_ant_direct
	langtons_ant_benchmark
)