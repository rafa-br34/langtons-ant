add_subdirectory("${PROJECT_SOURCE_DIR}/libs/argparse")

add_library(lib-argparse INTERFACE)
target_link_libraries(lib-argparse INTERFACE argparse)