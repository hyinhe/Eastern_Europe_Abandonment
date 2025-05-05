
/*Author:He Yin
  Date:20-April-2023
  Purpose: Mapping reforested land using land-cover maps and permanent-abandonment data.  
  
  Parameters: 
              despt*:the name of exported maps
              recultivation: recultivation map generated
*/
 
var NUTS2 = ee.FeatureCollection("projects/ee-hyinhe/assets/He/SILVIS/Eastern_Europe/East_Europe_boundary_NUTS2_v3");
var landmap1 = ee.Image("users/hyinhe/Europe_landcover/Class_2020_final_v1")
var landmap2 = ee.Image("users/hyinhe/Europe_landcover/Class_2019_final_v1")
var landmap3 = ee.Image("users/hyinhe/Europe_landcover/Class_2018_final_v1")
var recultivation = ee.Image("projects/ee-hyinhe/assets/He/SILVIS/Eastern_Europe/EEurope_recultivation")

//Create a forest mask - at least one pixel is mapped as forest during 2018-2020
var image_1=image.eq(2)
var image_2=image2.eq(2)
var image_3=image3.eq(2)
var forest=image_1.add(image_2).add(image_3).gt(0)

var reforest=recultivation.where(recultivation.eq(4), forest.multiply(100))

Export.image.toDrive({
  image: reforest,
  description: 'EEurope_reforest',
  crs: "EPSG:32637",
  folder:'GEE',
  region: image4.geometry(),
  scale: 30,
  maxPixels: 1e13
});

