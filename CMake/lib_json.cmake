add_subdirectory("${PROJECT_SOURCE_DIR}/libs/json")

add_library(lib-json INTERFACE)
target_link_libraries(lib-json INTERFACE nlohmann_json)