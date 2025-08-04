# Master Tables Integration with INNER JOINs

## Overview

The multi-agent system has been enhanced to support master tables and INNER JOINs for better data retrieval. This allows users to get more detailed information by joining sales data with master table information.

## New Master Tables Added

### 1. DayPartMst
- **Purpose**: Contains day part information (Lunch, Dinner, All Day, etc.)
- **Key Column**: `DayPartName`
- **Direct Query**: `SELECT DISTINCT DayPartName FROM dbo.DayPartMst WHERE CompanyCode='C1587' AND SiteCode='L2312'`

### 2. PaperchaseCategoryMaster
- **Purpose**: Contains category information for menu items
- **Key Column**: `PaperchaseCategoryName`
- **Direct Query**: `SELECT DISTINCT PaperchaseCategoryName FROM dbo.PaperchaseCategoryMaster WHERE CompanyCode='C1587' AND SiteCode='L2312'`

### 3. MenuItemCategoryMst
- **Purpose**: Contains sub-category information for menu items
- **Key Column**: `SubCategoryName`
- **Direct Query**: `SELECT DISTINCT SubCategoryName FROM dbo.MenuItemCategoryMst WHERE CompanyCode='C1587' AND SiteCode='L2312'`

### 4. RevenueCenterMst
- **Purpose**: Contains revenue center information (Restaurant, Bar, Terrace, etc.)
- **Key Column**: `RevenueCenterName`
- **Direct Query**: `SELECT DISTINCT RevenueCenterName FROM dbo.RevenueCenterMst WHERE CompanyCode='C1587' AND SiteCode='L2312'`

## INNER JOIN Patterns

The system now supports INNER JOINs to combine sales data with master table information:

### 1. Sales with DayPartName
```sql
SELECT TOP 100 main.DayPart, dp.DayPartName, FORMAT(SUM(main.NetAmount), 'N0', 'en-GB') AS TotalSales 
FROM dbo.Vw_SI_SalesDetails main 
INNER JOIN dbo.DayPartMst dp ON main.DayPart = dp.DayPart 
GROUP BY main.DayPart, dp.DayPartName 
ORDER BY TotalSales DESC
```

### 2. Sales with CategoryName
```sql
SELECT TOP 100 main.CategoryId, pcm.PaperchaseCategoryName, FORMAT(SUM(main.NetAmount), 'N0', 'en-GB') AS TotalSales 
FROM dbo.Vw_SI_SalesDetails main 
INNER JOIN dbo.PaperchaseCategoryMaster pcm ON main.CategoryId = pcm.CategoryId 
GROUP BY main.CategoryId, pcm.PaperchaseCategoryName 
ORDER BY TotalSales DESC
```

### 3. Sales with SubCategoryName
```sql
SELECT TOP 100 main.CategoryId, micm.SubCategoryName, FORMAT(SUM(main.NetAmount), 'N0', 'en-GB') AS TotalSales 
FROM dbo.Vw_SI_SalesDetails main 
INNER JOIN dbo.MenuItemCategoryMst micm ON main.CategoryId = micm.CategoryId 
GROUP BY main.CategoryId, micm.SubCategoryName 
ORDER BY TotalSales DESC
```

### 4. Sales with RevenueCenterName
```sql
SELECT TOP 100 main.RevenueCenter, rcm.RevenueCenterName, FORMAT(SUM(main.NetAmount), 'N0', 'en-GB') AS TotalSales 
FROM dbo.Vw_SI_SalesDetails main 
INNER JOIN dbo.RevenueCenterMst rcm ON main.RevenueCenter = rcm.RevenueCenter 
GROUP BY main.RevenueCenter, rcm.RevenueCenterName 
ORDER BY TotalSales DESC
```

## Usage Examples

### Getting Master Data Only
- **Question**: "Show me all DayPartName values"
- **Result**: Direct query to DayPartMst table

### Getting Sales Data with Master Information
- **Question**: "Show me sales data with DayPartName"
- **Result**: INNER JOIN between sales table and DayPartMst

### Getting Category Information
- **Question**: "Show me all PaperchaseCategoryName values"
- **Result**: Direct query to PaperchaseCategoryMaster table

### Getting Sales by Category
- **Question**: "Show me sales data with PaperchaseCategoryName"
- **Result**: INNER JOIN between sales table and PaperchaseCategoryMaster

## Router Agent Logic

The Router Agent now considers the new master tables when routing questions:

- **DayPartMst**: Questions about day parts (Lunch, Dinner, All Day, etc.)
- **PaperchaseCategoryMaster**: Questions about categories and category names
- **MenuItemCategoryMst**: Questions about sub-categories and sub-category names
- **RevenueCenterMst**: Questions about revenue centers and revenue center names

## Company and Site Code Filtering

All master table queries automatically include company and site code filtering:
- When both company_code and site_code are provided, filters by both
- When only company_code is provided, filters by company_code only
- Ensures data is specific to the selected company and site

## Testing

Use the test script `test_master_tables.py` to verify the functionality:

```bash
cd backend
python test_master_tables.py
```

This will test various scenarios including:
- Getting master data only
- Getting sales data with master information
- Different combinations of company and site codes

## API Integration

The multi-agent API now includes the new master tables in the available tables list:

```json
{
  "available_tables": [
    "Vw_SI_SalesDetails",
    "Vw_SI_SalesSummary", 
    "View_DiscountDetails",
    "DayPartMst",
    "PaperchaseCategoryMaster",
    "MenuItemCategoryMst",
    "RevenueCenterMst"
  ]
}
```

## Benefits

1. **More Detailed Data**: Users can now get sales data with descriptive names instead of just codes
2. **Better Analysis**: INNER JOINs provide richer context for business analysis
3. **Flexible Queries**: Support for both direct master table queries and combined sales queries
4. **Consistent Filtering**: Automatic company and site code filtering for all queries
5. **Enhanced Routing**: Router Agent can now route to appropriate master tables based on user questions 