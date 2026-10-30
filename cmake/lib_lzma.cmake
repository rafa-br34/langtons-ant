option(XZ_TOOL_XZDEC OFF)
option(XZ_TOOL_XZ OFF)
option(XZ_TOOL_LZMAINFO OFF)
option(XZ_TOOL_LZMADEC OFF)
add_subdirectory("${PROJECT_SOURCE_DIR}/libs/xz")

add_library(lib-lzma INTERFACE)

# Un-private liblzma includes
get_target_property(_priv_includes liblzma INCLUDE_DIRECTORIES)

target_link_libraries(lib-lzma INTERFACE liblzma)
target_include_directories(lib-lzma INTERFACE ${_priv_includes})
