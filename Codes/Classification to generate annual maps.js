/*Author:He Yin
  Date:21-Feb-2023 
  Purpose: Generate land cover map for a certain year
  Usage: To run the classification, first generate the spectral-temporal metrics with the “Calculate Spectral-Temporal Metrics from Landsat.js” script. Run the codes, then excuate "RUN" in the Tasks tab 
  Parameters: outname; training_samples
*/

var extent=ee.FeatureCollection('projects/ee-hyinhe/assets/He/SILVIS/Eastern_Europe/East_Europe_boundary_NUTS2_v3')

Map.addLayer(extent,{})
//zoom to the extent
Map.centerObject(extent, 9);

//Load the metrics for a certain year
var annualmetrics = ee.Image('projects/ee-hyinhe/assets/He/SILVIS/Eastern_Europe/annualmetrics2017'); 
print(annualmetrics);

//Set the output name
var annualmetrics_year =annualmetrics.get('year');
var outdes='Class_'+annualmetrics_year.getInfo()
var outname='EEurope_landcover/'+outdes+'_v1'
print(annualmetrics_year)

//Load the training_samples points generated in the previous step
var training_samples=ee.FeatureCollection('projects/ee-hyinhe/assets/He/SILVIS/Eastern_Europe/EEurope_training_samples').filterBounds(extent)

// classify imagery
var training = annualmetrics.sampleRegions({
  collection: training_samples,
  properties: ['Class'],
  scale: 30
});

var classifier = ee.Classifier.randomForest(300).train({
  features: training, 
  classProperty: 'Class'
});

var classified = annualmetrics_dem.classify(classifier);

// Export the result to an Earth Engine asset.
Export.image.toAsset({
  image: classified,
  description: outdes,
  assetId: outname,
  scale: 30,
  region: extent,
  maxPixels: 1e13
});
