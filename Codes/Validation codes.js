/*Author:He Yin
  Date:7-May-2023 
  Purpose: Plot Landsat imagery and NDVI, BSI, wetness and brightness time series for each validation sample 
  Usage: Set the ID of the validation samples using "var ID=", then run the codes
  Parameters: ID:validation point ID
              validSample: the validation points
*/
  
//Which validation point you want to view?
var ID=161
//Load validation samples

var validSample=ee.FeatureCollection('projects/amiable-poet-296019/assets/Recultivation_validation_EEurope_2024_Merge_v19_Part2_3_merge')

var validSample_sorted=validSample.sort('ID')

print(validSample_sorted.limit(10),'getPoint')

var sampleList=validSample_sorted.toList(validSample_sorted.size())
var getPoint=sampleList.get(ID)
var locat=ee.Feature(getPoint).geometry()
print(getPoint,'getPoint')

//Select the imgery during which period for plotting NDVI time series
  var start0='1986-01-1';
  var end0='2020-12-30';

  var start='1986-5-15';
  var end='1987-7-15';
  
  var start1='1995-5-15';
  var end1='1995-7-15';

  var start2='2000-5-15';
  var end2='2000-7-30';
  
  var start3='2005-5-15';
  var end3='2005-7-30';
  
  var start4='2010-5-15';
  var end4='2010-7-15';
  
  var start5='2015-5-15';
  var end5='2015-7-15';

  var start6='2020-5-15';
  var end6='2020-7-15';
  
//Defined the months for plotting NDVI time series 4:April, 11:November
  var startmonth= ee.Number(5);
  var endmonth=  ee.Number(10);

//Define the wondow size, 90 is a kernal size of three Landsat pixels
  var kernalsize =ee.Number(30);

//Define the size of the NDVI time series inspector panel
  var panelsize ='500px';

//select *th clouded imagery for the first window. For instant, 0 indicate the least clouded imagery, 
//1 indicates the second leasted clouded imagery
  var cloudness=ee.Number(0);

//Cloud masking and caculate NDVI
//cloud mask for L8, check https://landsat.usgs.gov/landsat-surface-reflectance-quality-assessment
var cloudMaskL8 = function (image) {
  var qa = image.select("QA_PIXEL");
  // "<<" is Bitwise left shift operator
  var cloud = qa
    .bitwiseAnd(1 << 2) // cirrus
    .or(qa.bitwiseAnd(1 << 1)) // dialated cloud
    .or(qa.bitwiseAnd(1 << 3)) //cloud
    .or(qa.bitwiseAnd(1 << 4)) //shadow
    .or(qa.bitwiseAnd(1 << 5)) // snow
    .or(qa.bitwiseAnd(1 << 9).and(qa.bitwiseAnd(1 << 10))) //combination of Bits 8-11
    //     .or(qa.bitwiseAnd(1 << 8).and(qa.bitwiseAnd(1 << 10)))
    .or(qa.bitwiseAnd(1 << 8).and(qa.bitwiseAnd(1 << 11)))
    .or(qa.bitwiseAnd(1 << 9).and(qa.bitwiseAnd(1 << 11)));
  var opticalBands = image
    .select(["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"])
    .multiply(0.0000275)
    .add(-0.2);
  //  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  var opticalBands_reScale = opticalBands; //.multiply(10000).toShort()
  //  var thermalBands_reScale=thermalBands.multiply(10).toShort()
  var img = opticalBands_reScale.rename(
    "blue",
    "green",
    "red",
    "nir",
    "swir1",
    "swir2"
  );
  var img2 = image
    .addBands(img)
    .select(["blue", "green", "red", "nir", "swir1", "swir2"]);
  return img2.updateMask(cloud.not()); //.updateMask(mask2)
};
//Calculate NDVI
  var addNDVI= function(image){
  var ndvi =image.normalizedDifference(['nir','red']).rename('L8_SR_NDVI');
  return image.addBands(ndvi);
};

var bsiL8=function(image){
  var bsi=image.select('swir2').add(image.select('red'))
        .subtract(image.select('nir')).subtract(image.select('blue'))
        .divide(image.select('swir2').add(image.select('red'))
        .add(image.select('nir')).add(image.select('blue')))
        .rename('L8_SR_bsi');
        return image.addBands(bsi);
};

var wetnessL8 = function(image){
  var wet= image.expression(
        '((BLUE * 0.0315) + (GREEN * 0.2021) + (RED * 0.3102) + (NIR * 0.1594) + (SWIR1 * -0.6806) + (SWIR2 * -0.6109))', {
          'SWIR2': image.select('swir2'),
          'SWIR1': image.select('swir1'),
          'NIR': image.select('nir'),
          'RED': image.select('red'),
          'GREEN': image.select('green'),
          'BLUE': image.select('blue')
      }).rename('L8_SR_wetness');    
      return image.addBands(wet);
};

var brightnessL8 = function(image){
  var bright= image.expression(
    '(BLUE * 0.2043) + (GREEN * 0.4158) + (RED * 0.5524) + (NIR * 0.5741) + (SWIR1 * 0.3124) + (SWIR2 * 0.2303)', {
          'SWIR2': image.select('swir2'),
          'SWIR1': image.select('swir1'),
          'NIR': image.select('nir'),
          'RED': image.select('red'),
          'GREEN': image.select('green'),
          'BLUE': image.select('blue')
      }).rename('L8_SR_brightness');
  return image.addBands(bright);
};     

//Apply the cloud mask on L8
  var collectionL8_ndvi = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate(start0, end0)
    .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL8)
    .map(addNDVI)
    .select('L8_SR_NDVI');
  
  var collectionL8_bsi = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate(start0, end0)
    .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL8)
    .map(bsiL8)
    .select('L8_SR_bsi');
    
   var collectionL8_wet = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate(start0, end0)
    .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL8)
    .map(wetnessL8)
    .select('L8_SR_wetness'); 
    
    var collectionL8_bright = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate(start0, end0)
    .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL8)
    .map(brightnessL8)
    .select('L8_SR_brightness'); 
    
//cloud mask for L4-7
  var cloudMaskL457 = function(image) {
  var qa = image.select('QA_PIXEL');
  var cloud = qa.bitwiseAnd(1 << 1)
          .or(qa.bitwiseAnd(1 << 0)) // filled value
          .or(qa.bitwiseAnd(1 << 2))
          .or(qa.bitwiseAnd(1 << 3))
          .or(qa.bitwiseAnd(1 << 4))
          .or(qa.bitwiseAnd(1 << 5))
          .or(qa.bitwiseAnd(1 << 9).and(qa.bitwiseAnd(1 << 10)))
     //     .or(qa.bitwiseAnd(1 << 8).and(qa.bitwiseAnd(1 << 10)))
          .or(qa.bitwiseAnd(1 << 8).and(qa.bitwiseAnd(1 << 11)))
          .or(qa.bitwiseAnd(1 << 9).and(qa.bitwiseAnd(1 << 11)))
  var opticalBands = image.select(['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7']).multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  var opticalBands_reScale=opticalBands.multiply(10000).toShort()
  var thermalBands_reScale=thermalBands.multiply(10).toShort()
  var img=opticalBands_reScale.rename('blue', 'green', 'red', 'nir', 'swir1', 'swir2');
  //var mask2 = image.mask().reduce(ee.Reducer.min())
  return img.updateMask(cloud.not()).copyProperties(image, ["system:time_start"])//.updateMask(mask2)
  
}; 
  var addNDVI= function(image){
  var ndvi =image.normalizedDifference(['nir','red']).rename('L4_7_SR_NDVI');
  return image.addBands(ndvi);
};

var bsiL7=function(image){
  var bsi=image.select('swir2').add(image.select('red'))
        .subtract(image.select('nir')).subtract(image.select('blue'))
        .divide(image.select('swir2').add(image.select('red'))
        .add(image.select('nir')).add(image.select('blue')))
        .rename('L4_7_SR_bsi');
        return image.addBands(bsi);
  
};

var wetL7 = function(image){
  var wet= image.expression(
        '(BLUE * 0.0315) + (GREEN * 0.2021) + (RED * 0.3102) + (NIR * 0.1594) + (SWIR1 * -0.6806) + (SWIR2 * -0.6109)', {
          'SWIR2': image.select('swir2'),
          'SWIR1': image.select('swir1'),
          'NIR': image.select('nir'),
          'RED': image.select('red'),
          'GREEN': image.select('green'),
          'BLUE': image.select('blue')
      }).rename('L4_7_SR_wetness');    
      return image.addBands(wet);
};

var brightL7 = function(image){
  var bright= image.expression(
          '(BLUE * 0.2043) + (GREEN * 0.4158) + (RED * 0.5524) + (NIR * 0.5741) + (SWIR1 * 0.3124) + (SWIR2 * 0.2303)', {
          'SWIR2': image.select('swir2'),
          'SWIR1': image.select('swir1'),
          'NIR': image.select('nir'),
          'RED': image.select('red'),
          'GREEN': image.select('green'),
          'BLUE': image.select('blue')
      }).rename('L4_7_SR_brightness');    
      return image.addBands(bright);
};

//Calculate NDVI from L7 and L5
  var collectionL7_ndvi = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
    .filterDate(start0, end0)
    .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL457)
    .map(addNDVI)
    .select('L4_7_SR_NDVI');
    
  var collectionL5_ndvi = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
    .filterDate(start0, end0)
   .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL457)
    .map(addNDVI)
    .select('L4_7_SR_NDVI');
    
  var collectionL4_ndvi = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2')
    .filterDate(start0, end0)
   .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL457)
    .map(addNDVI)
    .select('L4_7_SR_NDVI');
    
      var collectionL7_bsi = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
    .filterDate(start0, end0)
    .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL457)
    .map(bsiL7)
    .select('L4_7_SR_bsi');
    
  var collectionL5_bsi = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
    .filterDate(start0, end0)
   .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL457)
    .map(bsiL7)
    .select('L4_7_SR_bsi');
    
    var collectionL4_bsi = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2')
    .filterDate(start0, end0)
   .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL457)
    .map(bsiL7)
    .select('L4_7_SR_bsi');  
    
    var collectionL7_wet = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
    .filterDate(start0, end0)
    .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL457)
    .map(wetL7)
    .select('L4_7_SR_wetness');
    
  var collectionL5_wet = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
    .filterDate(start0, end0)
   .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL457)
    .map(wetL7)
    .select('L4_7_SR_wetness');
    
  var collectionL4_wet = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2')
    .filterDate(start0, end0)
   .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL457)
    .map(wetL7)
    .select('L4_7_SR_wetness');
    
    var collectionL7_bright = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
    .filterDate(start0, end0)
    .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL457)
    .map(brightL7)
    .select('L4_7_SR_brightness');
    
  var collectionL5_bright = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
    .filterDate(start0, end0)
  .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL457)
    .map(brightL7)
    .select('L4_7_SR_brightness');
     
  var collectionL4_bright = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2')
    .filterDate(start0, end0)
  .filter(ee.Filter.calendarRange(startmonth,endmonth,'month'))
    .map(cloudMaskL457)
    .map(brightL7)
    .select('L4_7_SR_brightness');

//Merge all the collections
  var collection_ndvi = collectionL8_ndvi.merge(collectionL5_ndvi).merge(collectionL4_ndvi)
                       .merge(collectionL7_ndvi)//.merge(collectionS_ndvi);
                       
  var collection_bsi = collectionL8_bsi.merge(collectionL5_bsi).merge(collectionL4_bsi)
                       .merge(collectionL7_bsi)//.merge(collectionS_bsi);
   //                   .merge(collectionS);
  var collection_wet = collectionL8_wet.merge(collectionL5_wet).merge(collectionL4_wet)
                       .merge(collectionL7_wet)//.merge(collectionS_wet);
                       
  var collection_bright = collectionL8_bright.merge(collectionL5_bright).merge(collectionL4_bright)
                      .merge(collectionL7_bright)//.merge(collectionS_bright);                     
  //                   .merge(collectionS);

// Applies scaling factors.
function applyScaleFactors_ETM(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  return image.addBands(opticalBands, null, true).select(["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B7"])
         .rename(["blue", "green", "red", "nir", "swir1", "swir2"])
}

function applyScaleFactors_OLI(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  return image.addBands(opticalBands, null, true).select(["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"])
         .rename(["blue", "green", "red", "nir", "swir1", "swir2"])
}

 var cfilter=function(start,end,locat){
  var collection8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate(start, end)
    .filterBounds(locat)
    .map(applyScaleFactors_OLI)

  var collection7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
    .filterDate(start, end)
    .filterBounds(locat)
    .map(applyScaleFactors_ETM)

  var collection5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
    .filterDate(start, end)
    .filterBounds(locat)
    .map(applyScaleFactors_ETM)

  var collection4 = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2')
    .filterDate(start, end)
    .filterBounds(locat)
    .map(applyScaleFactors_ETM)

//Merge all the collections
  var collection=collection8.merge(collection7).merge(collection5).merge(collection4)
    .sort('CLOUD_COVER_LAND', true);
    return collection
}
    
  var collection_1=cfilter(start,end,locat);
  print(collection_1,'collection_1')
  var collection_2=cfilter(start1,end1,locat);
  var collection_3=cfilter(start2,end2,locat);
  var collection_4=cfilter(start3,end3,locat);
  var collection_5=cfilter(start4,end4,locat);
  var collection_6=cfilter(start5,end5,locat);
  var collection_7=cfilter(start6,end6,locat);


print()
//Get the imagery list
  var imagery_list_1 =collection_1.toList(collection_1.size());
  print(start,imagery_list_1);
  
  var imagery_list_2 =collection_2.toList(collection_2.size());
  print(start1,imagery_list_2);
  
  var imagery_list_3 =collection_3.toList(collection_3.size());
  print(start2,imagery_list_3);
  
  var imagery_list_4 =collection_4.toList(collection_4.size());
  print(start3,imagery_list_4);
  
  var imagery_list_5 =collection_5.toList(collection_5.size());
  print(start4,imagery_list_5);
  
  var imagery_list_6 =collection_6.toList(collection_6.size());
  print(start5,imagery_list_6);
  
  var imagery_list_7 =collection_7.toList(collection_7.size());
  print(start6,imagery_list_7);
  
  
//get the *the clouded imagery from the list, 'cloudness' was defined at the beginning
  var image1 =ee.Image(imagery_list_1.get(cloudness));
  var name1_0 =ee.String(image1.id());
  var strlength = name1_0.length();
  var name1 = name1_0.slice(16, strlength);  
  var id1=name1.getInfo();
  
  var image2 =ee.Image(imagery_list_2.get(cloudness));
  var name2_0 =ee.String(image2.id());
  var strlength2 = name2_0.length();
  var name2 = name2_0.slice(16, strlength2);  
  var id2=name2.getInfo();
  
  var image3 =ee.Image(imagery_list_3.get(cloudness));
  var name3_0 =ee.String(image3.id());
  var strlength3 = name3_0.length();
  var name3 = name3_0.slice(16, strlength3);  
  var id3=name3.getInfo();
  
    var image4 =ee.Image(imagery_list_4.get(cloudness));
  var name4_0 =ee.String(image4.id());
    var strlength4 = name4_0.length();
  var name4 = name4_0.slice(16, strlength4);  
  var id4=name4.getInfo();
  
    var image5 =ee.Image(imagery_list_5.get(cloudness));
  var name5_0 =ee.String(image5.id());
    var strlength5 = name5_0.length();
  var name5 = name5_0.slice(16, strlength5);  
  var id5=name5.getInfo();
  
    var image6 =ee.Image(imagery_list_6.get(cloudness));
  var name6_0 =ee.String(image6.id());
    var strlength6 = name6_0.length();
  var name6 = name6_0.slice(16, strlength6);  
  var id6=name6.getInfo();
    
  var image7 =ee.Image(imagery_list_7.get(cloudness));
  var name7_0 =ee.String(image7.id());
    var strlength7 = name7_0.length();
  var name7 = name7_0.slice(16, strlength7);  
  var id7=name7.getInfo();
  
  
//Set the band combination and color scheme
  var vis1={bands: ["swir2", "nir", "red"], min:0, max: 0.5};
  var vis2={bands: ["nir", "swir1", "red"], min:0, max: 0.5};

  var imageclear1 = ee.Image(image1).visualize(vis2);
  var imageclear2 = ee.Image(image2).visualize(vis2);
  var imageclear3 = ee.Image(image3).visualize(vis2);
  var imageclear4 = ee.Image(image4).visualize(vis2);
  var imageclear5 = ee.Image(image5).visualize(vis2);
  var imageclear6 = ee.Image(image6).visualize(vis2);
  var imageclear7 = ee.Image(image7).visualize(vis2);

  Map.addLayer(locat, {color: 'FF0000'},'Initial location');

// Create the main map and set the NDVI layer.
  var mapPanel = ui.Panel();
  mapPanel.style().set('width', panelsize);

// Create an intro panel with labels.
  var intro = ui.Panel([
  ui.Label({
    value: 'NDVI/BSI Time Series Inspector',
    style: {fontSize: '20px', fontWeight: 'bold'}
  }),
  ui.Label('Click a location to see NDVI/BSI time series from Landsat and Sentinel 2')
]);
  mapPanel.add(intro);

// Create panels to hold lon/lat values.
  var lon = ui.Label();
  var lat = ui.Label();
  mapPanel.add(ui.Panel([lon, lat], ui.Panel.Layout.flow('horizontal')));

// function to create map 2-4
  var map1 = new ui.Map();
  var map2 = new ui.Map();
  var map3 = new ui.Map();
  var map4 = new ui.Map();
  var map5 = new ui.Map();
  var map6 = new ui.Map();
  var map7 = new ui.Map();
 // var map8 = new ui.Map();
//  var map9 = new ui.Map();
 

//// Chart setup

// Generates a new time series chart of NDVI for the given coordinates.
  var generateChart=function (coords) {
// Update the lon/lat panel with values from the click event.
  lon.setValue('lon: ' + coords.lon.toFixed(2));
  lat.setValue('lat: ' + coords.lat.toFixed(2));
// Add a dot for the point clicked on.
  var point = ee.Geometry.Point(coords.lon, coords.lat);
  print(point.coordinates());
//the color https://en.wikipedia.org/wiki/Web_colors
//https://developers.google.com/earth-engine/tutorial_api_02
  var dot = ui.Map.Layer(point, {color: 'FF0000'}, 'clicked location');
// Add the dot as the second layer, so it shows up on top of the composite.
//set the number to 15 indicates there are 15 layers except the "clicked location"
  Map.layers().set(15, dot);
// Make a chart from the ndvi time series.

  var ndviChart = ui.Chart.image.series(collection_ndvi, point, ee.Reducer.mean(), kernalsize);
// Customize the chart.
  ndviChart.setOptions({
    title: 'NDVI: time series',
    vAxis: {title: 'NDVI',ticks:[-0.1,0,0.2,0.4,0.6,0.8,1]},
    hAxis: {title: 'Date', format: 'MM-yy', gridlines: {count: 7}},
    series: {
      0: {
        color: 'blue',
        lineWidth: 0,
        pointsVisible: true,
        pointSize: 2,
      },
      1: {
        color: 'red',
        lineWidth: 0,
        pointsVisible: true,
        pointSize: 2,
      },
      2: {
        color: 'green',
        lineWidth: 0,
        pointsVisible: true,
        pointSize: 2,
      },
    },
    legend: {position: 'right'},
  });
// Add the chart at a fixed position, so that new charts overwrite older ones.
 
 
// Make a chart from the time series.
var bsiChart = ui.Chart.image.series(collection_bsi, point, ee.Reducer.mean(), kernalsize);

// // Customize the chart.
  bsiChart.setOptions({
    title: 'BSI: time series',
    vAxis: {title: 'BSI',ticks:[-0.8,-0.6,-0.4,-0.2,0,0.2,0.4,0.6,0.8]},
    hAxis: {title: 'Date', format: 'MM-yy', gridlines: {count: 7}},
    series: {
      0: {
        color: 'blue',
        lineWidth: 0,
        pointsVisible: true,
        pointSize: 2,
      },
      1: {
        color: 'red',
        lineWidth: 0,
        pointsVisible: true,
        pointSize: 2,
      },
      2: {
        color: 'green',
        lineWidth: 0,
        pointsVisible: true,
        pointSize: 2,
      },
    },
    legend: {position: 'right'},
  });
// Add the chart at a fixed position, so that new charts overwrite older ones.
  
  // Make a chart from the wetness time series.
  var wetChart = ui.Chart.image.series(collection_wet, point, ee.Reducer.mean(), kernalsize);

// Customize the chart.
  wetChart.setOptions({
    title: 'Wetness: time series',
    vAxis: {title: 'Wetness',ticks:[-5000,-4000,-3000,-2000,-1000,0]},
    hAxis: {title: 'Date', format: 'MM-yy', gridlines: {count: 7}},
    series: {
      0: {
        color: 'blue',
        lineWidth: 0,
        pointsVisible: true,
        pointSize: 2,
      },
      1: {
        color: 'red',
        lineWidth: 0,
        pointsVisible: true,
        pointSize: 2,
      },
      2: {
        color: 'green',
        lineWidth: 0,
        pointsVisible: true,
        pointSize: 2,
      },
    },
    legend: {position: 'right'},
  });
  

  var brightChart = ui.Chart.image.series(collection_bright, point, ee.Reducer.mean(), kernalsize);

// Customize the chart.
  brightChart.setOptions({
    title: 'Brightness: time series',
    vAxis: {title: 'Brightness',ticks:[1000,2000,3000,4000,5000,6000]},
    hAxis: {title: 'Date', format: 'MM-yy', gridlines: {count: 7}},
    series: {
      0: {
        color: 'blue',
        lineWidth: 0,
        pointsVisible: true,
        pointSize: 2,
      },
      1: {
        color: 'red',
        lineWidth: 0,
        pointsVisible: true,
        pointSize: 2,
      },
      2: {
        color: 'green',
        lineWidth: 0,
        pointsVisible: true,
        pointSize: 2,
      },
    },
    legend: {position: 'right'},
  });
  
    mapPanel.widgets().set(2, ndviChart);
    mapPanel.widgets().set(3, bsiChart);
    mapPanel.widgets().set(4, wetChart);
    mapPanel.widgets().set(5, brightChart);

// Add the chart at a fixed position, so that new charts overwrite older ones.
  //  mapPanel.widgets().set(4, wetChart);
   
  
    map1.setCenter(point.coordinates().get(0).getInfo(),point.coordinates().get(1).getInfo(), 14);
    map1.addLayer(image1, vis2);
    map1.addLayer(point, {color:'FF0000'});
    map1.add(ui.Label(id1, {position:'bottom-center'}));
  
  
    map2.setCenter(point.coordinates().get(0).getInfo(),point.coordinates().get(1).getInfo(), 14);
    map2.addLayer(image2, vis2);
    map2.addLayer(point, {color:'FF0000'});
    map2.add(ui.Label(id2, {position:'bottom-center'}));
    
    map3.setCenter(point.coordinates().get(0).getInfo(),point.coordinates().get(1).getInfo(), 14);
    map3.addLayer(image3, vis2);
    map3.addLayer(point, {color:'FF0000'});
    map3.add(ui.Label(id3, {position:'bottom-center'}));
    
    map4.setCenter(point.coordinates().get(0).getInfo(),point.coordinates().get(1).getInfo(), 14);
    map4.addLayer(image4, vis2);
    map4.addLayer(point, {color:'FF0000'});
    map4.add(ui.Label(id4, {position:'bottom-center'}));
    
    map5.setCenter(point.coordinates().get(0).getInfo(),point.coordinates().get(1).getInfo(), 14);
    map5.addLayer(image5, vis2);
    map5.addLayer(point, {color:'FF0000'});
    map5.add(ui.Label(id5, {position:'bottom-center'}));
    
    map6.setCenter(point.coordinates().get(0).getInfo(),point.coordinates().get(1).getInfo(), 14);
    map6.addLayer(image6, vis2);
    map6.addLayer(point, {color:'FF0000'});
    map6.add(ui.Label(id6, {position:'bottom-center'}));
  
    map7.setCenter(point.coordinates().get(0).getInfo(),point.coordinates().get(1).getInfo(), 14);
    map7.addLayer(image7, vis2);
    map7.addLayer(point, {color:'FF0000'});
    map7.add(ui.Label(id7, {position:'bottom-center'}));
  
};

// Register a callback on the default map to be invoked when the map is clicked.
  Map.onClick(generateChart);
// Configure the map.
  Map.style().set('cursor', 'crosshair');
// Initialize with a test point.
  var initialPoint = locat;
  Map.centerObject(initialPoint, 14);
//Initialize the app

// Insert the map
  ui.root.insert(1, mapPanel);

  generateChart({
  lon: initialPoint.coordinates().get(0).getInfo(),
  lat: initialPoint.coordinates().get(1).getInfo()
});


  function initMap(map) {
  //map.setCenter(long1,lat1, 14);
}
// Initialize
  initMap(Map);

  function createMap(title) {
  var map = ui.Map();
  ui.Label(title, {position:'bottom-center'});
  map.add(title);
  return map;
}

  function getMapSize() {
  var scale = Map.getScale();
  var bounds = ee.Geometry(Map.getBounds(true)).coordinates().get(0).getInfo();
  
  var ll = bounds[0];
  var ur = bounds[2];
  var width = (ur[0] - ll[0]) / scale;
  var height = (ur[1] - ll[1]) / scale;
  
  return { w: Math.floor(width), h: Math.floor(height) };
}
  var maps = [map1, map2,map3,map4, map5,map6, map7];

  var height = getMapSize().h;

// Create a panel with vertical flow layout.
  var panel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {width: '100vw', height: height + '300px'}
});

  var linker = ui.Map.Linker(maps);
//print(linker);

  maps.map(function(map) { 
  initMap(map)
  Map.setOptions('HYBRID')
  panel.add(map)
})

  ui.root.insert(1, maps[6]);
  ui.root.insert(1, maps[5]);
  ui.root.insert(1, maps[4]);
  ui.root.insert(1, maps[3]);
  ui.root.insert(1, maps[2]);
  ui.root.insert(1, maps[1]);
  ui.root.insert(1, maps[0]);

var linker = ui.Map.Linker(maps);
