// src/components/PurchaseOrderChart.tsx
import React, { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "./Card";

interface DynamicData {
    [key: string]: any;
}

const PurchaseOrderChart = ({ data }: { data: DynamicData[] }) => {
    const [xAxisKey, setXAxisKey] = useState<string>("");
    const [yAxisKey, setYAxisKey] = useState<string>("");

    // Get all column names from the first row
    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

    // Set default X and Y axis when data changes
    useEffect(() => {
        if (columns.length > 1) {
            setXAxisKey(columns[0]);
            setYAxisKey(columns[1]);
        } else if (columns.length === 1) {p.er
            setXAxisKey(columns[0]);
            setYAxisKey("");
        }
    }, [data]);

    // Function to safely convert any value to a number
    const safeNumberConversion = (value: any): number => {
        if (typeof value === 'number') {
            return isNaN(value) ? 0 : value;
        }
        if (typeof value === 'string') {
            // Remove commas and other non-numeric characters except decimal points and minus signs
            const cleanValue = value.replace(/[^\d.-]/g, '');
            const num = parseFloat(cleanValue);
            return isNaN(num) ? 0 : num;
        }
        return 0;
    };

    // Function to check if a column contains numeric data
    const isNumericColumn = (columnName: string): boolean => {
        if (!data || data.length === 0) return false;
        
        // Check if at least 70% of values in this column are numeric
        const numericCount = data.filter(row => {
            const value = row[columnName];
            const numValue = safeNumberConversion(value);
            return numValue > 0 || (numValue === 0 && value !== null && value !== undefined);
        }).length;
        
        return (numericCount / data.length) >= 0.7; // 70% threshold
    };

    // Function to calculate optimal Y-axis range for a specific column
    const calculateYAxisRange = (columnName: string): [number, number] => {
        if (!data || data.length === 0 || !isNumericColumn(columnName)) {
            return [0, 100]; // Default range for non-numeric columns
        }

        // Get all numeric values from the column
        const values = data
            .map(row => safeNumberConversion(row[columnName]))
            .filter(val => val >= 0); // Only include non-negative values

        if (values.length === 0) {
            return [0, 100];
        }

        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);

        // Ensure we have valid numbers
        if (isNaN(maxValue) || maxValue <= 0) {
            return [0, 100];
        }

        // Calculate optimal upper bound based on the data range
        let upperBound: number;
        
        // If all values are the same, create some range
        if (maxValue === minValue) {
            upperBound = maxValue * 1.2;
        } else {
            // Calculate range and add padding
            const range = maxValue - minValue;
            const padding = range * 0.2; // 20% padding
            upperBound = maxValue + padding;
        }

        // Round up to nice numbers based on the magnitude
        if (upperBound >= 1000000) {
            upperBound = Math.ceil(upperBound / 100000) * 100000;
        } else if (upperBound >= 100000) {
            upperBound = Math.ceil(upperBound / 10000) * 10000;
        } else if (upperBound >= 10000) {
            upperBound = Math.ceil(upperBound / 1000) * 1000;
        } else if (upperBound >= 1000) {
            upperBound = Math.ceil(upperBound / 100) * 100;
        } else if (upperBound >= 100) {
            upperBound = Math.ceil(upperBound / 10) * 10;
        } else {
            upperBound = Math.ceil(upperBound);
        }

        // Ensure upper bound is valid and reasonable
        if (isNaN(upperBound) || upperBound <= 0) {
            return [0, 100];
        }

        // For very small ranges, ensure minimum visibility
        if (upperBound < 10) {
            upperBound = 10;
        }

        return [0, upperBound];
    };

    // Calculate Y-axis domain based on current Y-axis selection
    const yAxisDomain = useMemo((): [number, number] => {
        return calculateYAxisRange(yAxisKey);
    }, [data, yAxisKey]);

    // Function to format numbers (no currency)
    const formatNumber = (value: number) => {
        if (typeof value !== "number" || isNaN(value)) return "0";
        if (value >= 10000000) {
            return (value / 10000000).toFixed(1) + "Cr";
        } else if (value >= 100000) {
            return (value / 100000).toFixed(1) + "L";
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + "K";
        } else {
            return value.toFixed(0);
        }
    };

    // Clean and validate the data to prevent NaN errors
    const cleanData = data?.map(row => {
        const cleanRow: DynamicData = {};
        Object.keys(row).forEach(key => {
            const value = row[key];
            // If this is the Y-axis column, ensure it's a valid number
            if (key === yAxisKey) {
                cleanRow[key] = safeNumberConversion(value);
            } else {
                cleanRow[key] = value;
            }
        });
        return cleanRow;
    }) || [];

    // Get available columns for Y-axis (exclude the current X-axis selection)
    const availableYAxisColumns = columns.filter(col => col !== xAxisKey);

    // Validate that we have valid axis selections
    const hasValidAxes = xAxisKey && yAxisKey && xAxisKey !== yAxisKey;
    const hasData = data && data.length > 0;

    if (!hasData) {
        return (
            <div className="w-full flex items-center justify-center text-gray-500">
                No data available
            </div>
        );
    }

    if (!hasValidAxes) {
        return (
            <div className="w-full p-4 shadow-md rounded-2xl">
                <div className="mb-4">
                    <h2 className="text-xl font-semibold mb-2">Data Visualization</h2>
                </div>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">X-Axis</label>
                        <select
                            className="border rounded px-2 py-1"
                            value={xAxisKey}
                            onChange={e => {
                                const newXAxis = e.target.value;
                                setXAxisKey(newXAxis);
                                // If current Y-axis is the same as new X-axis, reset Y-axis
                                if (yAxisKey === newXAxis) {
                                    const remainingColumns = columns.filter(col => col !== newXAxis);
                                    if (remainingColumns.length > 0) {
                                        setYAxisKey(remainingColumns[0]);
                                    } else {
                                        setYAxisKey("");
                                    }
                                }
                            }}
                        >
                            {columns.map(col => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Y-Axis</label>
                        <select
                            className="border rounded px-2 py-1"
                            value={yAxisKey}
                            onChange={e => setYAxisKey(e.target.value)}
                        >
                            {availableYAxisColumns.map(col => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex items-center justify-center text-gray-500 h-[400px]">
                    Please select different columns for X and Y axes
                </div>
            </div>
        );
    }

    return (
        <div className="w-full p-4 shadow-md rounded-2xl">
            <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Data Visualization</h2>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium mb-1">X-Axis</label>
                    <select
                        className="border rounded px-2 py-1"
                        value={xAxisKey}
                        onChange={e => {
                            const newXAxis = e.target.value;
                            setXAxisKey(newXAxis);
                            // If current Y-axis is the same as new X-axis, reset Y-axis
                            if (yAxisKey === newXAxis) {
                                const remainingColumns = columns.filter(col => col !== newXAxis);
                                if (remainingColumns.length > 0) {
                                    setYAxisKey(remainingColumns[0]);
                                } else {
                                    setYAxisKey("");
                                }
                            }
                        }}
                    >
                        {columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Y-Axis</label>
                    <select
                        className="border rounded px-2 py-1"
                        value={yAxisKey}
                        onChange={e => setYAxisKey(e.target.value)}
                    >
                        {availableYAxisColumns.map(col => (
                            <option key={col} value={col}>
                                {col} {isNumericColumn(col) ? '(Numeric)' : '(Text)'}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            
            {/* Debug info - you can remove this later */}
            <div className="mb-2 text-xs text-gray-500">
                X-Axis: {xAxisKey} | Y-Axis: {yAxisKey} | Data points: {data.length} | Y-Range: {formatNumber(yAxisDomain[0])} - {formatNumber(yAxisDomain[1])} | Numeric: {isNumericColumn(yAxisKey) ? 'Yes' : 'No'}
            </div>
            
            <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cleanData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                            dataKey={xAxisKey}
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                        />
                        <YAxis 
                            domain={yAxisDomain}
                            tickFormatter={formatNumber}
                            tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                            formatter={(value: any) => formatNumber(safeNumberConversion(value))}
                            labelFormatter={label => `${xAxisKey}: ${label}`}
                        />
                        <Bar 
                            dataKey={yAxisKey} 
                            fill="#BF2A2D" 
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PurchaseOrderChart;