set(_LIB_DIR libs/lodepng)

add_library(lib-lodepng STATIC ${_LIB_DIR}/lodepng.cpp)
target_include_directories(lib-lodepng PUBLIC ${_LIB_DIR})