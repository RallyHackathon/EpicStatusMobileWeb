(function() {
  var ChartTime, GRAY, GREEN, RED, YELLOW, epicStatusCalculator, lumenize, root, timeSeriesCalculator, utils, _calculateColor,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  root = this;

  if (typeof exports !== "undefined" && exports !== null) {
    lumenize = require('../lib/lumenize');
  } else {
    lumenize = require('/lumenize');
  }

  ChartTime = lumenize.ChartTime, timeSeriesCalculator = lumenize.timeSeriesCalculator;

  utils = lumenize.utils;

  GRAY = '#E0E0E0';

  RED = '#FCB5B1';

  GREEN = '#B2E3B6';

  YELLOW = '#FBDE98';

  epicStatusCalculator = function(results, config) {
    /*
      Takes the "results" from a query to Rally's Analytics API (or similar MVCC-based implementation)
      and returns the series for burn charts.
    */

    var aaa, acceptancePx, acceptanceStartDelay, aggregationAtArray, aggregations, barChartSVG, color, colorConfig, derivedFields, derivedFields2, doneStates, filteredResults, i, idx, lastPoint, lenAAA, name, nowCT, nowRDN, output, percentCompletePx, percentPointsComplete, percentTimeComplete, percentTimeCompletePx, points, pointsComplete, r, rangeSpec, releaseDateCT, releaseDateRDN, releaseLength, releaseStartDateCT, releaseStartDateRDN, row, svg, svgHeight, svgPoints, svgSlice, svgThirdHeight, svgWidth, timeComplete, timeSeriesCalculations, timeSeriesConfig, totalTime, warningDelay, warningPx, x, y, _i, _j, _k, _len, _len1, _len2, _ref;
    output = [];
    svgWidth = 100;
    svgHeight = 60;
    releaseDateCT = new lumenize.ChartTime(config.releaseInfo[0].ReleaseDate);
    releaseDateRDN = releaseDateCT.rataDieNumber();
    releaseStartDateCT = new lumenize.ChartTime(config.releaseInfo[0].ReleaseStartDate);
    releaseStartDateRDN = releaseStartDateCT.rataDieNumber();
    nowCT = new lumenize.ChartTime(lumenize.ChartTime.getZuluString());
    nowRDN = nowCT.rataDieNumber();
    doneStates = ["Completed", "Accepted"];
    rangeSpec = {
      start: releaseStartDateCT,
      pastEnd: nowCT,
      granularity: 'day'
    };
    derivedFields = [
      {
        name: 'AcceptedPoints',
        f: function(row) {
          var _ref;
          if (_ref = row.ScheduleState, __indexOf.call(doneStates, _ref) >= 0) {
            return row.PlanEstimate;
          } else {
            return 0;
          }
        }
      }
    ];
    aggregations = [
      {
        field: 'PlanEstimate',
        f: '$sum'
      }, {
        field: 'AcceptedPoints',
        f: '$sum'
      }
    ];
    timeSeriesConfig = {
      rangeSpec: rangeSpec,
      snapshotValidFromField: '_ValidFrom',
      snapshotValidToField: '_ValidTo',
      snapshotUniqueID: 'ObjectID',
      timezone: 'America/New_York',
      derivedFields: derivedFields,
      aggregations: aggregations
    };
    _ref = config.interestingEpics;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      row = _ref[i];
      filteredResults = [];
      for (_j = 0, _len1 = results.length; _j < _len1; _j++) {
        r = results[_j];
        if (r._ItemHierarchy[0] === row.objectID) {
          filteredResults.push(r);
        }
      }
      timeSeriesCalculations = lumenize.timeSeriesCalculator(filteredResults, timeSeriesConfig);
      console.log(timeSeriesCalculations);
      aggregationAtArray = timeSeriesCalculations.aggregationAtArray;
      derivedFields2 = [
        {
          name: 'FractionComplete',
          f: function(row) {
            if (row.PlanEstimate_$sum === 0) {
              return 0;
            }
            return row.AcceptedPoints_$sum / row.PlanEstimate_$sum;
          }
        }
      ];
      lumenize.deriveFields(aggregationAtArray, derivedFields2);
      lastPoint = aggregationAtArray[aggregationAtArray.length - 1];
      points = lastPoint.PlanEstimate_$sum;
      pointsComplete = lastPoint.AcceptedPoints_$sum;
      percentPointsComplete = Math.round((pointsComplete / points) * 100);
      timeComplete = nowRDN - releaseStartDateRDN;
      totalTime = releaseDateRDN - releaseStartDateRDN;
      percentTimeComplete = Math.round((timeComplete / totalTime) * 100);
      svgPoints = "";
      lenAAA = aggregationAtArray.length;
      svgSlice = (percentTimeComplete * svgWidth / 100) / lenAAA;
      for (idx = _k = 0, _len2 = aggregationAtArray.length; _k < _len2; idx = ++_k) {
        aaa = aggregationAtArray[idx];
        if (idx >= config.trackingDelay) {
          x = idx * svgSlice;
          y = (1 - aaa.FractionComplete) * svgHeight;
          svgPoints += "" + x + "," + y + " ";
        }
      }
      console.log(svgPoints);
      /*
          color = '#00FF00'
          if percentTimeComplete > percentPointsComplete
            color = '#FF0000'
      */

      acceptanceStartDelay = 0.15 * (releaseDateRDN - releaseStartDateRDN);
      warningDelay = acceptanceStartDelay;
      colorConfig = {
        asOfDate: nowRDN,
        startDate: releaseStartDateRDN,
        endDate: releaseDateRDN,
        percentComplete: percentPointsComplete,
        acceptanceStartDelay: acceptanceStartDelay,
        warningDelay: warningDelay
      };
      color = _calculateColor(colorConfig);
      svgThirdHeight = svgHeight / 3;
      releaseLength = releaseDateRDN - releaseStartDateRDN;
      acceptancePx = svgWidth * acceptanceStartDelay / releaseLength;
      warningPx = svgWidth * (acceptanceStartDelay + warningDelay) / releaseLength;
      percentCompletePx = (100 - percentPointsComplete) / 100 * svgHeight;
      percentTimeCompletePx = percentTimeComplete / 100 * svgWidth;
      svg = "<svg width=\"" + svgWidth + "px\" height=\"" + svgHeight + "px\" xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\">\n  <polygon points=\"" + warningPx + "," + svgHeight + " " + svgWidth + "," + svgHeight + " " + svgWidth + ",0\" stroke-width=\"0\" fill=\"" + RED + "\" />\n  <polygon points=\"" + warningPx + "," + svgHeight + " " + acceptancePx + "," + svgHeight + " " + svgWidth + ",0\" stroke-width=\"0\" fill=\"" + YELLOW + "\" />\n  <polygon points=\"0," + svgHeight + " 0,0 " + svgWidth + ",0 " + acceptancePx + "," + svgHeight + "\" stroke-width=\"0\" fill=\"" + GREEN + "\" />\n  <polyline points=\"" + svgPoints + "\" stroke=\"black\" stroke-width=\"1\" fill=\"none\" />\n  <circle cx=\"" + percentTimeCompletePx + "\" cy=\"" + percentCompletePx + "\" r=\"6\" stroke=\"black\" stroke-width=\"1\" fill=\"none\" />\n  <circle cx=\"" + percentTimeCompletePx + "\" cy=\"" + percentCompletePx + "\" r=\"2\" stroke=\"black\" stroke-width=\"0\" fill=\"black\" />\n</svg>";
      barChartSVG = "<svg width=\"" + svgWidth + "px\" height=\"" + svgHeight + "px\" xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\">\n  <rect y=\"" + svgThirdHeight + "px\" rx=\"4px\" ry=\"4px\" height=\"" + svgThirdHeight + "px\" width=\"" + svgWidth + "px\" stroke-width=\"0\" fill=\"" + GRAY + "\" />\n  <rect y=\"" + svgThirdHeight + "px\" rx=\"4px\" ry=\"4px\" height=\"" + svgThirdHeight + "px\" width=\"" + (svgWidth * percentPointsComplete / 100) + "px\" stroke-width=\"0\" fill=\"" + color + "\" />\n  <text x=\"" + (svgWidth / 2 - 15) + "px\" y=\"" + (svgThirdHeight * 2 - 5) + "px\" fill=\"black\">" + percentPointsComplete + " %</text>\n</svg>";
      name = row.name;
      output.push({
        name: name,
        points: points,
        svg: svg,
        barChartSVG: barChartSVG
      });
    }
    return output;
  };

  _calculateColor = function(c) {
    var redSlope, redThreshold, redXIntercept, redYIntercept, yellowSlope, yellowThreshold, yellowXIntercept, yellowYIntercept;
    if (c.acceptanceStartDelay == null) {
      c.acceptanceStartDelay = 0.1 * (c.endDate - c.startDate);
    }
    if (c.warningDelay == null) {
      c.warningDelay = c.acceptanceStartDelay;
    }
    if (c.asOfDate < c.startDate) {
      return GRAY;
    }
    if (c.asOfDate >= c.endDate) {
      if (c.percentComplete >= 100.0) {
        return GREEN;
      } else {
        return RED;
      }
    }
    redXIntercept = c.startDate + c.acceptanceStartDelay + c.warningDelay;
    redSlope = 100.0 / (c.endDate - redXIntercept);
    redYIntercept = -1.0 * redXIntercept * redSlope;
    redThreshold = redSlope * c.asOfDate + redYIntercept;
    if (c.percentComplete < redThreshold) {
      return RED;
    }
    yellowXIntercept = c.startDate + c.acceptanceStartDelay;
    yellowSlope = 100 / (c.endDate - yellowXIntercept);
    yellowYIntercept = -1.0 * yellowXIntercept * yellowSlope;
    yellowThreshold = yellowSlope * c.asOfDate + yellowYIntercept;
    if (c.percentComplete < yellowThreshold) {
      return YELLOW;
    }
    return GREEN;
  };

  root.epicStatusCalculator = epicStatusCalculator;

}).call(this);
