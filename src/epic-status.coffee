root = this

if exports?
  lumenize = require('../lib/lumenize')  # in node.js
else
  lumenize = require('/lumenize')  # in the browser

{ChartTime, timeSeriesCalculator} = lumenize
utils = lumenize.utils

GRAY = '#E0E0E0'
RED = '#FCB5B1'
GREEN = '#B2E3B6'
YELLOW = '#FBDE98'

epicStatusCalculator = (results, config) ->
  ###
  Takes the "results" from a query to Rally's Lookback API and returns the SVG
  for the % Done Status Detail. It also returns the SVG for a % Done Status Bar
  Chart.
  ###

  output = []
       
  svgWidth = 100
  svgHeight = 60
  
  releaseDateCT = new lumenize.ChartTime(config.releaseInfo[0].ReleaseDate)
  releaseDateRDN = releaseDateCT.rataDieNumber()
  releaseStartDateCT = new lumenize.ChartTime(config.releaseInfo[0].ReleaseStartDate)
  releaseStartDateRDN = releaseStartDateCT.rataDieNumber()
  nowCT = new lumenize.ChartTime(lumenize.ChartTime.getZuluString())
  nowRDN = nowCT.rataDieNumber()
  
  doneStates = ["Completed", "Accepted"]
  
  rangeSpec = 
    start: releaseStartDateCT
    pastEnd: nowCT
    granularity: 'day'
  
  derivedFields = [
    {
      name: 'AcceptedPoints', 
      f: (row) -> 
        if row.ScheduleState in doneStates
          return row.PlanEstimate
        else
          return 0
    }
  ] 
  
  aggregations = [
#     {as: 'Drill-down', field:'ObjectID', f:'$push'}
    {field: 'PlanEstimate', f: '$sum'}
    {field: 'AcceptedPoints', f: '$sum'}
  ]
  
  timeSeriesConfig =
    rangeSpec: rangeSpec
    snapshotValidFromField: '_ValidFrom'
    snapshotValidToField: '_ValidTo'
    snapshotUniqueID: 'ObjectID'
    timezone: 'America/New_York'
    derivedFields: derivedFields
    aggregations: aggregations
 
  for row, i in config.interestingEpics
  
    filteredResults = []
    for r in results
      if r._ItemHierarchy[0] == row.objectID
        filteredResults.push(r)
        
    timeSeriesCalculations = lumenize.timeSeriesCalculator(filteredResults, timeSeriesConfig)
    
    console.log(timeSeriesCalculations)
    
    {aggregationAtArray} = timeSeriesCalculations
    
    derivedFields2 = [
      {
        name: 'FractionComplete', 
        f: (row) ->
          if row.PlanEstimate_$sum == 0
            return 0
          return row.AcceptedPoints_$sum / row.PlanEstimate_$sum
      }
    ]
    
    lumenize.deriveFields(aggregationAtArray, derivedFields2)
     
    lastPoint = aggregationAtArray[aggregationAtArray.length - 1]
    points = lastPoint.PlanEstimate_$sum
    pointsComplete = lastPoint.AcceptedPoints_$sum
                        
    percentPointsComplete = Math.round((pointsComplete / points) * 100)
    
    timeComplete = nowRDN - releaseStartDateRDN
    totalTime = releaseDateRDN - releaseStartDateRDN
    percentTimeComplete = Math.round((timeComplete / totalTime) * 100)
    
    svgPoints = ""
    lenAAA = aggregationAtArray.length
    svgSlice = (percentTimeComplete * svgWidth / 100) / lenAAA
    
    for aaa, idx in aggregationAtArray
      if idx >= config.trackingDelay
        x = idx * svgSlice
        y = (1 - aaa.FractionComplete) * svgHeight  # accumulate the aaa.FractionComplete * 100 if you want an array of % Done over time
        svgPoints += "#{x},#{y} "
    
    acceptanceStartDelay = 0.15 * (releaseDateRDN - releaseStartDateRDN)
    warningDelay = acceptanceStartDelay
    
    colorConfig =
      asOfDate: nowRDN
      startDate: releaseStartDateRDN
      endDate: releaseDateRDN
      percentComplete: percentPointsComplete
      acceptanceStartDelay: acceptanceStartDelay
      warningDelay: warningDelay
      
    color = _calculateColor(colorConfig)

    svgThirdHeight = svgHeight / 3
    releaseLength = releaseDateRDN - releaseStartDateRDN
    acceptancePx = svgWidth * acceptanceStartDelay / releaseLength
    warningPx = svgWidth * (acceptanceStartDelay + warningDelay) / releaseLength
    percentCompletePx = (100 - percentPointsComplete)/100 * svgHeight
    percentTimeCompletePx = percentTimeComplete/100 * svgWidth
    
    svg = """
    <svg width="#{svgWidth}px" height="#{svgHeight}px" xmlns="http://www.w3.org/2000/svg" version="1.1">
      <polygon points="#{warningPx},#{svgHeight} #{svgWidth},#{svgHeight} #{svgWidth},0" stroke-width="0" fill="#{RED}" />
      <polygon points="#{warningPx},#{svgHeight} #{acceptancePx},#{svgHeight} #{svgWidth},0" stroke-width="0" fill="#{YELLOW}" />
      <polygon points="0,#{svgHeight} 0,0 #{svgWidth},0 #{acceptancePx},#{svgHeight}" stroke-width="0" fill="#{GREEN}" />
      <polyline points="#{svgPoints}" stroke="black" stroke-width="1" fill="none" />
      <circle cx="#{percentTimeCompletePx}" cy="#{percentCompletePx}" r="6" stroke="black" stroke-width="1" fill="none" />
      <circle cx="#{percentTimeCompletePx}" cy="#{percentCompletePx}" r="2" stroke="black" stroke-width="0" fill="black" />
    </svg>
    """
  
    # !TODO: Make Text Scale with svgHeight
    barChartSVG = """
    <svg width="#{svgWidth}px" height="#{svgHeight}px" xmlns="http://www.w3.org/2000/svg" version="1.1">
      <rect y="#{svgThirdHeight}px" rx="4px" ry="4px" height="#{svgThirdHeight}px" width="#{svgWidth}px" stroke-width="0" fill="#{GRAY}" />
      <rect y="#{svgThirdHeight}px" rx="4px" ry="4px" height="#{svgThirdHeight}px" width="#{svgWidth * percentPointsComplete / 100}px" stroke-width="0" fill="#{color}" />
      <text x="#{svgWidth / 2 - 15}px" y="#{svgThirdHeight * 2 - 5}px" fill="black">#{percentPointsComplete} %</text>
    </svg>
    """
    
    name = row.name
    
    output.push({name, points, svg, barChartSVG})
  
  return output
  
_calculateColor = (c) ->
  
  unless c.acceptanceStartDelay?
    c.acceptanceStartDelay = 0.1 * (c.endDate - c.startDate)

  unless c.warningDelay?
    c.warningDelay = c.acceptanceStartDelay
  
  # Special cases
  if c.asOfDate < c.startDate
    return GRAY
  
  if c.asOfDate >= c.endDate
    if c.percentComplete >= 100.0
      return GREEN
    else
      return RED
  
  # Red
  redXIntercept = c.startDate + c.acceptanceStartDelay + c.warningDelay
  redSlope = 100.0 / (c.endDate - redXIntercept)
  redYIntercept = -1.0 * redXIntercept * redSlope
  redThreshold = redSlope * c.asOfDate + redYIntercept
  if c.percentComplete < redThreshold
    return RED
  
  # Yellow
  yellowXIntercept = c.startDate + c.acceptanceStartDelay
  yellowSlope = 100 / (c.endDate - yellowXIntercept)
  yellowYIntercept = -1.0 * yellowXIntercept * yellowSlope
  yellowThreshold = yellowSlope * c.asOfDate + yellowYIntercept
  if c.percentComplete < yellowThreshold
    return YELLOW
  
  # Green
  return GREEN  
  
root.epicStatusCalculator = epicStatusCalculator