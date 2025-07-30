// src/components/PurchaseOrderChart.tsx
import React, { useState, useEffect } from "react";
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
        } else if (columns.length === 1) {
            setXAxisKey(columns[0]);
            setYAxisKey("");
        }
    }, [data]);

    // Function to format numbers (no currency)
    const formatNumber = (value: number) => {
        if (typeof value !== "number") return value;
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

    if (!data || data.length === 0) {
        return (
            <div className="w-full  flex items-center justify-center text-gray-500">
                No data available
            </div>
        );
    }

    return (
        <div className="w-full p-4 shadow-md rounded-2xl ">
            <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Data Visualization</h2>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium mb-1">X-Axis</label>
                    <select
                        className="border rounded px-2 py-1"
                        value={xAxisKey}
                        onChange={e => setXAxisKey(e.target.value)}
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
                        {columns
                            .filter(col => col !== xAxisKey)
                            .map(col => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                    </select>
                </div>
            </div>
            <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                            dataKey={xAxisKey}
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                        />
                        <YAxis 
                            tickFormatter={formatNumber}
                        />
                        <Tooltip 
                            formatter={(value: number) => formatNumber(value)}
                            labelFormatter={label => `${xAxisKey}: ${label}`}
                        />
                        {yAxisKey && (
                            <Bar 
                                dataKey={yAxisKey} 
                                fill="#BF2A2D" 
                                radius={[4, 4, 0, 0]}
                            />
                        )}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PurchaseOrderChart;