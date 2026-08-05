TRACKER_SLUG, TRACKER = ...
TRACKER_MSG_ADDONNAME = C_AddOns.GetAddOnMetadata( TRACKER_SLUG, "Title" )
TRACKER_MSG_VERSION   = C_AddOns.GetAddOnMetadata( TRACKER_SLUG, "Version" )
TRACKER_MSG_AUTHOR    = C_AddOns.GetAddOnMetadata( TRACKER_SLUG, "Author" )

TRACKER_data = {}

function TRACKER.OnLoad()
	-- print("Tracker> OnLoad()")
	SLASH_TRACKER1 = "/TRACKER"
	SLASH_TRACKER2 = "/TI"
	SlashCmdList["TRACKER"] = function(msg) TRACKER.command(msg); end
	TRACKER_Frame:RegisterEvent("BAG_UPDATE")
	TRACKER_Frame:RegisterEvent("ADDON_LOADED")
end
----------
function TRACKER.ADDON_LOADED()
	TRACKER_Frame:UnregisterEvent("ADDON_LOADED")
	TRACKER.name  = UnitName("player")
	TRACKER.realm = GetRealmName()
	TRACKER.playerSlug = TRACKER.realm.."-"..TRACKER.name
	TRACKER.pruneData()
end
function TRACKER.BAG_UPDATE()
	-- print("TRACKER> BAG_UPDATE")
	local today = date("%Y%m%d")
	for itemID, _ in pairs(TRACKER_data) do
		local youHave =  GetItemCount( itemID, true, nil, true ) -- include bank
		local inAccount = C_Item.GetItemCount( itemID, false, false, false, true ) - youHave  -- WBB
		TRACKER_data[itemID].players = TRACKER_data[itemID].players or {}
		TRACKER_data[itemID].players[TRACKER.playerSlug] = ( youHave > 0 and youHave or nil )
		TRACKER_data[itemID].totals = TRACKER_data[itemID].totals or {}
		local playerTotal = 0
		for _, playerCount in pairs( TRACKER_data[itemID].players ) do
			playerTotal = playerTotal + playerCount
		end
		local itemTotal = inAccount + playerTotal
		-- print("youHave: "..youHave..", inAccount: "..inAccount..", playerTotal: "..playerTotal..", itemTotal: "..itemTotal)
		TRACKER_data[itemID].totals[today] = TRACKER_data[itemID].totals[today]
				or { ["start"] = itemTotal, ["min"] = itemTotal, ["max"] = itemTotal }
		TRACKER_data[itemID].totals[today].min = math.min( TRACKER_data[itemID].totals[today].min, itemTotal )
		TRACKER_data[itemID].totals[today].max = math.max( TRACKER_data[itemID].totals[today].max, itemTotal )
		TRACKER_data[itemID].totals[today].final = itemTotal
	end
end
------
function TRACKER.parseCmd(msg)
	if msg then
		local i,c = strmatch(msg, "^(|c.*|r)%s*(%d*)$")
		if i then  -- i is an item, c is a count or nil
			return i, c
		else  -- Not a valid item link
			msg = string.lower(msg)
			local a,b,c = strfind(msg, "(%S+)")  --contiguous string of non-space characters
			if a then
				-- c is the matched string, strsub is everything after that, skipping the space
				return c, strsub(msg, b+2)
			else
				return ""
			end
		end
	end
end
function TRACKER.command(msg)
	local cmd, param = TRACKER.parseCmd(msg)
	local cmdFunc = TRACKER.CommandList[cmd]
	if cmdFunc then
		cmdFunc.func(pram)
	elseif ( cmd and cmd ~= "" ) then
		TRACKER.addItem( cmd )
	else
	end
end
-------
function TRACKER.pruneData()
	local cutOffDay=date("%Y%m%d", time()-(86400*13))
	for itemID, itemData in pairs(TRACKER_data) do
		for day, _ in pairs(itemData.totals) do
			if day < cutOffDay then
				itemData.totals[day] = nil
			end
		end
	end
end
function TRACKER.getItemIdFromLink(itemLink)
	-- returns just the integer itemID
	-- itemLink can be a full link, or just "item:999999999"
	if itemLink then
		return strmatch( itemLink, "item:(%d*)" ) or strmatch( itemLink, "i:(%d*)" )
	end
end
function TRACKER.addItem(itemLink)
	local itemID = TRACKER.getItemIdFromLink(itemLink)
	print(itemID)
	if itemID and string.len(itemID) > 0 then
		-- local youHave =  GetItemCount( itemID, true, nil, true ) -- include bank
		-- local inBags = GetItemCount( itemID, false ) -- only in bags
		-- local inAccount = C_Item.GetItemCount( itemID, false, false, false, true ) - inBags
		TRACKER_data[itemID] = TRACKER_data[itemID] or {}
		local itemName, itemLink = GetItemInfo( itemID )
		TRACKER_data[itemID].name = itemName
		TRACKER_data[itemID].link = itemLink
		TRACKER.BAG_UPDATE()
	end
end


TRACKER.CommandList = {

}
