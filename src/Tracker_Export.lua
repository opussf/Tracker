#!/usr/bin/env lua
-- Version: @VERSION@

accountPath = arg[1]
exportType = arg[2]

pathSeparator = string.sub(package.config, 1, 1) -- first character of this string (http://www.lua.org/manual/5.2/manual.html#pdf-package.config)
-- remove 'extra' separators from the end of the given path
while (string.sub( accountPath, -1, -1 ) == pathSeparator) do
	accountPath = string.sub( accountPath, 1, -2 )
end
-- append the expected location of the datafile
dataFilePath = {
	accountPath,
	"SavedVariables",
	"Tracker.lua"
}
dataFile = table.concat( dataFilePath, pathSeparator )

function FileExists( name )
	local f = io.open( name, "r" )
	if f then io.close( f ) return true else return false end
end
function DoFile( filename )
	local f = assert( loadfile( filename ) )
	return f()
end
function sorted_pairs( tableIn )
	local keys = {}
	for k in pairs( tableIn ) do table.insert( keys, k ) end
	table.sort( keys )
	local lcv = 0
	local iter = function()
		lcv = lcv + 1
		if keys[lcv] == nil then return nil
		else return keys[lcv], tableIn[keys[lcv]]
		end
	end
	return iter
end
function dayStrToTS(strIn)
	local y = string.sub( strIn, 1, 4 )
	local m = string.sub( strIn, 5, 6 )
	local d = string.sub( strIn, 7, 8 )
	return os.time{ year=y, month=m, day=d }
end
function ExportCSV()
	-- build data
	-- need min day, and max day
	local minDay, maxDay
	for itemID, itemData in pairs( TRACKER_data ) do
		for day, _ in pairs( itemData.totals ) do
			minDay = math.min(minDay or day, day)
			maxDay = math.max(maxDay or day, day)
		end
	end
	minDay = dayStrToTS( minDay )
	maxDay = dayStrToTS( maxDay )

	local report = {}
	local row = {"itemID", "itemName"}
	for day = minDay, maxDay, 86400 do
		table.insert( row, os.date( "%m/%d", day ) )
	end
	table.insert( report, table.concat( row, "," ) )

	for itemID, itemData in sorted_pairs( TRACKER_data ) do
		row={ itemID, itemData.name }

		local lastValue = ""
		for day = minDay, maxDay, 86400 do
			local dayStr = os.date( "%Y%m%d", day )
			lastValue = itemData.totals[dayStr] and itemData.totals[dayStr].final or lastValue
			table.insert( row, lastValue )
		end

		table.insert( report, table.concat( row, "," ) )
	end
	strOut = table.concat( report, "\n" ).."\n"
	return strOut
end

functionList = {
	["csv"] = ExportCSV,
}

func = functionList[string.lower(exportType)]

if dataFile and FileExists(dataFile) and exportType and func then
	DoFile( dataFile )
	strOut = func()
	print( strOut )
else
	io.stderr:write( "Something is wrong.  Lets review:\n")
	io.stderr:write( "Data file provided: "..( dataFile and " True" or "False" ).."\n" )
	io.stderr:write( "Data file exists  : "..( FileExists( dataFile ) and " True" or "False" ).."\n" )
	io.stderr:write( "ExportType given  : "..( exportType and " True" or "False" ).."\n" )
	io.stderr:write( "ExportType valid  : "..( func and " True" or "False" ).."\n" )
end