google.charts.load("current", {packages:["corechart", "controls"]});

var app = angular.module('TrackerApp', ['angularMoment']);
app.controller('TrackerController', ["$scope", "$http", "$interval", "moment", function( $scope, $http, $interval, moment ) {

function parseDayStr(strIn) {
	const year = Number(strIn.slice(0, 4));
	const month = Number(strIn.slice(4, 6)) - 1; // JS months are 0-indexed
	const day = Number(strIn.slice(6, 8));
	return new Date(year, month, day);
}
function* dateRange(startStr, endStr) {
	const current = parseDayStr(startStr);
	const end = parseDayStr(endStr);

	while (current <= end) {
		yield new Date(current); // yield a copy
		current.setDate(current.getDate() + 1);
	}
}
$scope.formatDay = function(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}${m}${d}`;
};
$scope.getTotalsField = function(totals, field, index) {
	const dayStr = $scope.formatDay($scope.days[index]);

	return totals[dayStr][field];
};
$scope.getTotalsFieldDiff = function(totals, field, index) {
	if (index==0) {
		return '';
	}
	const dayStr = $scope.formatDay($scope.days[index]);
	const prevStr = $scope.formatDay($scope.days[index-1]);

	const diff = totals[dayStr][field] - totals[prevStr][field];

	if (diff != 0) {
		if (diff > 0) {
			return "+"+diff;
		} else {
			return diff;
		}
	} else { return "\u00A0"; }  // &nbsp;
};
$scope.itemOnClick = function(itemID) {
	$scope.graphID = itemID;
	$scope.drawChart(itemID);
}
$scope.drawChart = function(itemID) {
	const item = $scope.items.filter(item => item.id == itemID)[0];
	itemData = new Array();

	for (const index in $scope.days) {
		day = $scope.days[index];
		dayStr = $scope.formatDay(day);
		itemData.push( new Array (
			day, 
			item.totals[dayStr].min,
			item.totals[dayStr].start,
			item.totals[dayStr].final,
			item.totals[dayStr].max
		));
	}

	var dataTable = new google.visualization.DataTable();
	dataTable.addColumn({ type: 'date', id: 'Date' });
	dataTable.addColumn({ type: 'number', id: 'min' });
	dataTable.addColumn({ type: 'number', id: 'open' });
	dataTable.addColumn({ type: 'number', id: 'close' });
	dataTable.addColumn({ type: 'number', id: 'max' });
	dataTable.addRows( itemData );

	// var csv = google.visualization.dataTableToCsv(dataTable);
    // console.log(csv);

	var options = {
		legend: 'none',
		title: item.name,
		bar: { groupWidth: '100%' },
		candlestick: {
			fallingColor: { strokeWidth: 0, fill: '#a52714' }, // red
			risingColor: { strokeWidth: 0, fill: '#0f9d58' }   // green
		}
	};

	var chart = new google.visualization.CandlestickChart(document.getElementById('chart_div'));
	chart.draw(dataTable, options);

}

$scope.loadData = function() {
	$http.get('Tracker.json?date='+Date.now())
		.then( function( response ) {
			$scope.items = response.data.TrackerData.items;
			$scope.minDay = null;
			$scope.dataLoadedAt = new Date();
			$scope.dataLastModified = new Date(response.headers("last-modified"));

			angular.forEach( $scope.items, function( item, key ) {
				angular.forEach( item.totals, function( totals, day ) {
					$scope.minDay = Math.min( $scope.minDay ?? day, day );
					$scope.maxDay = Math.max( $scope.maxDay ?? day, day );
				} );
			} );

			$scope.days = [...dateRange(String($scope.minDay), String($scope.maxDay))];

			// Sigh, massage the data

			angular.forEach( $scope.items, function( item, key ) {
				let last = {};
				for (const index in $scope.days) {
					day = $scope.days[index];
					dayStr = $scope.formatDay(day);
					if (!item.totals[dayStr]) {
						$scope.items[key].totals[dayStr] = {
							start: 0,
							min: 0,
							max: 0,
							final: 0 };
						if (index > 0) {
							prevDayStr = $scope.formatDay($scope.days[index-1]);
							$scope.items[key].totals[dayStr].start = 
								$scope.items[key].totals[prevDayStr].final;
							$scope.items[key].totals[dayStr].final =
								$scope.items[key].totals[prevDayStr].final;
							$scope.items[key].totals[dayStr].min =
								$scope.items[key].totals[prevDayStr].final;
							$scope.items[key].totals[dayStr].max =
								$scope.items[key].totals[prevDayStr].final;
						}
					}
				}
			} );
		} )
		.then( function() {
			console.log($scope.graphID);
			if ($scope.graphID !== undefined) {
				$scope.drawChart($scope.graphID);
			}
		} )
};

//initial load
$scope.loadData();

var reload = $interval( function() {
	$scope.loadData();
	console.log("Reload here");
	}, 60000);

} ] );
