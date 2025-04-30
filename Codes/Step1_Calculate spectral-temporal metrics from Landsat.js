/*Author:He Yin (https://www.kent.edu/profile/he-yin)
  Email: hyinhe@gmail.com 
  Date: 2/21/2023
  This script is used to:
    First, do cloud masking and combine TM, ETM and OLI
    Second,calculate indices such as bsi, nbr, ndvi, tasseled cap transformation
    Third, calculate annual metrics from TM, ETM, OLI. The indices include each spectral band (blue-swir2), bsi, nbr, ndvi and Tasseled Cap transformation
    Fourth, generate annual metrics for each period defined as "years"
    
  Usage: Run the codes, then export the results to the Assets by clicking the "RUN" button in the "Tasks" tab
  Parameters:
           extent: the extent of your study area
           years: the target period that you want to generate annual metrics
           doystart/doyend: the time windows during which the metrics will be calculated
           outputfolder:export location where you want to store your data in Assets. Ideally the name is 'yourstudyarea_img'
*/
// It may take a moment while the batch export finishes—thanks for your patience //
 
var tools=require('users/hyinhe/LUCS2021:Tools')

//Set the extent of the study area 
var locat=ee.FeatureCollection('projects/ee-hyinhe/assets/He/SILVIS/Eastern_Europe/East_Europe_boundary_NUTS2_v3')

//Pick the target years. For example, to calculate metrics for each individual years from 1986 to 1990, set "ee.List.sequence(1986,1990)"
var years=ee.List.sequence(1986,1988)

//Pick the period (day of the year) that is used for generating annual metrics
var doystart =1
var doyend =365

//Export location, make a new folder first in your Assets
var outputfolder='He/Eastern_Europe'

//zoom to the extent
Map.centerObject(locat, 7);

//Load the data that are defined by location and period. Add 1 year before and after the target year
var filterCollection = function(year,doystart, doyend, sensor, locat){
    var previousYear=ee.Number(year).subtract(1);
    var afterYear=ee.Number(year).add(1);
    var col_1= ee.ImageCollection('LANDSAT/'+ sensor + '/C02/T1_L2')
           .filterBounds(locat)
           .filter(ee.Filter.calendarRange(year, year, 'year'))
           .filter(ee.Filter.calendarRange(doystart, doyend, 'day_of_year'))
          // .map(tools.additionalmask)
  var col_2= ee.ImageCollection('LANDSAT/'+ sensor + '/C02/T1_L2')
          .filterBounds(locat)
          .filter(ee.Filter.calendarRange(afterYear, afterYear, 'year'))
          .filter(ee.Filter.calendarRange(doystart, doyend, 'day_of_year'))
          .map(tools.additionalmask)
  var col_3= ee.ImageCollection('LANDSAT/'+ sensor + '/C02/T1_L2')
          .filterBounds(locat)
          .filter(ee.Filter.calendarRange(previousYear, previousYear, 'year'))
          .filter(ee.Filter.calendarRange(doystart, doyend, 'day_of_year'))
          .map(tools.additionalmask)
  return col_1.merge(col_2).merge(col_3);
};

//Load Landsat SR collection
var getSRcollection = function(year, doystart, doyend, sensor, locat) {
  // get a landsat collection for given year, day range, and sensor
  var srCollection = filterCollection(year, doystart, doyend, sensor, locat);

  srCollection = srCollection.map(function(img) {
    var data = ee.Algorithms.If(
        sensor == 'LC08' | 'LC09',                                 // condition - if image is Landsat 8
        tools.cloudMaskL8_C2(img),                           // true - then apply L8 masking
        tools.cloudMaskL457_C2(img)                          // false - else apply L4-7 making
      )
      return data;
  });
 
  srCollection=srCollection.map(function(img){
    var data2 =tools.indice(img)
    return data2;
  });
  return srCollection; // return the prepared collection
};
//
var MetricsCollection = function(year, doystart, doyend, locat) {
    var lt4 = getSRcollection(year, doystart, doyend, 'LT04', locat);       // get TM collection for a given year, date range, and area
    var lt5 = getSRcollection(year, doystart, doyend, 'LT05', locat);       // get TM collection for a given year, date range, and area
    var le7 = getSRcollection(year, doystart, doyend, 'LE07', locat);       // get ETM+ collection for a given year, date range, and area
    var lc8 = getSRcollection(year, doystart, doyend, 'LC08', locat);       // get OLI collection for a given year, date range, and area
    var Collection = ee.ImageCollection(lt4.merge(lt5).merge(le7).merge(lc8))
    return Collection;                                              // return the Imagecollection
};

var metrics =function(year, doystart, doyend,locat){
        var composite= MetricsCollection(year, doystart, doyend, locat).reduce(ee.Reducer.mean())
          .addBands(MetricsCollection(year, doystart, doyend, locat).reduce(ee.Reducer.stdDev()))
          .addBands(MetricsCollection(year, doystart, doyend, locat).reduce(ee.Reducer.percentile([20,40,60,80])))
          .toShort()
          .set('year', (new Date(year,0,1)).valueOf());
        return composite.set('year', (new Date(year,0,1)).valueOf());
};

//Batch calculation
var imgs=ee.ImageCollection.fromImages(
          years.map(function(y){
            return metrics(ee.Number(y), doystart, doyend,locat).set('year', y);
          })  
  );
print(imgs)

//Batch export
var Exportbatch = function(imgs, folder, scale,
                        maxPixels, region) {
    scale = scale || 30;
    maxPixels = maxPixels || 1e13;
var root = ee.data.getAssetRoots()[0]['id']
var assetfolder = root+'/'+folder+'/'
    var colList = imgs.toList(imgs.size());
    var n = colList.size().getInfo();

    for (var i = 0; i < n; i++) {
      var img = ee.Image(colList.get(i));
      var id = img.get('year').getInfo();
      region = region || img.geometry().bounds().getInfo()["coordinates"];
//The name of the exported file is defined in assetId
      Export.image.toAsset({
        image:img,
        description: 'Export'+id,
        assetId: assetfolder+'annualmetrics'+id,
        region: region,
        scale: scale,
        maxPixels: maxPixels})
    }
  }
Exportbatch(imgs, outputfolder, 30,1e13, locat)
