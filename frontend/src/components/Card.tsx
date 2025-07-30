import React from "react";

type CardProps = {
    children: React.ReactNode;
    className?: string;
};

export const Card: React.FC<CardProps> = ({ children, className = "" }) => {
    return (
        <div className="bg-white p-4 rounded-2xl shadow ${className}">
            {children}
        </div>
    );
};