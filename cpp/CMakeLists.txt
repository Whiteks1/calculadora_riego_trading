cmake_minimum_required(VERSION 3.16)
project(trading_risk_calculator_cpp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(risk_engine STATIC risk_engine.cpp)
target_include_directories(risk_engine PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

add_executable(trading_risk_calculator main.cpp)
target_link_libraries(trading_risk_calculator PRIVATE risk_engine)

add_executable(risk_case_runner risk_case_runner.cpp)
target_link_libraries(risk_case_runner PRIVATE risk_engine)
