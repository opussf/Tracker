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

	console.log(totals, field, index, dayStr);
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

$scope.loadData = function() {
	$http.get('Tracker.json?date='+Date.now())
		.then( function( response ) {
			$scope.items = response.data.TrackerData.items;
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

					console.log(key, dayStr, item.name);
				}
			} );

		} )
};

//initial load
$scope.loadData();

var reload = $interval( function() {
	$scope.loadData();
	console.log("Reload here");
	}, 60000);

} ] );
