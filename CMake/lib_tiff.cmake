add_subdirectory("${PROJECT_SOURCE_DIR}/libs/libtiff")

add_library(lib-tiff INTERFACE)
target_link_libraries(lib-tiff INTERFACE tiff)