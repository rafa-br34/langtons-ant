set(SDL_STATIC ON)
add_subdirectory("${PROJECT_SOURCE_DIR}/libs/SDL")

add_library(lib-sdl3 INTERFACE)
target_link_libraries(lib-sdl3 INTERFACE SDL3::SDL3-static)