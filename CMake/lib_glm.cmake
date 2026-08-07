add_subdirectory("${PROJECT_SOURCE_DIR}/libs/glm")

add_library(lib-glm INTERFACE)
target_link_libraries(lib-glm INTERFACE glm::glm)