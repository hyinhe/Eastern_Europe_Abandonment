/*Author:He Yin
  Date:21-Feb-2023 
  Purpose: Generate land cover map for a certain year. The spectral-temporal metrics calculated from the Step-1 scirpt “Calculate Spectral-Temporal Metrics from Landsat.js” script are needed as inputs (line 15).
  Usage: Run the codes, then excuate "RUN" in the Tasks tab 
  Parameters: annualmetrics, outname; training_samples
*/

var extent=ee.FeatureCollection('projects/ee-hyinhe/assets/He/SILVIS/Eastern_Europe/East_Europe_boundary_NUTS2_v3')

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

//Load the training_samples points. This dataset is also available in the folder "Data/Training_samples"
var training_samples=ee.FeatureCollection('projects/ee-hyinhe/assets/He/SILVIS/Eastern_Europe/EEurope_training_samples').filterBounds(extent)

// Sampling
var training = annualmetrics.sampleRegions({
  collection: training_samples,
  properties: ['Class'],
  scale: 30
});
// Build a random forest classifier
var classifier = ee.Classifier.randomForest(300).train({
  features: training, 
  classProperty: 'Class'
});

classify imagery
var classified = annualmetrics.classify(classifier);

// Export the result to an Earth Engine asset.
Export.image.toAsset({
  image: classified,
  description: outdes,
  assetId: outname,
  scale: 30,
  region: extent,
  maxPixels: 1e13
});
