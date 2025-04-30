/*Author:He Yin
  Date:20-April-2023
  Purpose: 1. Count the frequency of cropland and perform a temporal fiter to remove noises in annual classifications
           2. Label cropland abandonment from land cover map series, return the abandonment events
           3. Apply minimum mapping unit to reduce salt and pepper effect
           Abandonment defination: a cropland pixel that is 4 years active followed by 5 year non-active

  FAO: Arable land refers to land under temporary crops (doublecropped areas are counted only once), temporary meadows
  for mowing or pasture, land under market and kitchengardens and land temporarily fallow (less than five years).
  The abandoned land resulting from shifting cultivation is not included.

  Usage: Run the codes, then excuate "RUN" in the Tasks tab to export the results
  
  Class codes in the results: 0: non-cropland; 1991-2013, the timing of abandonment
  
  Parameters: 
              despt*:the name of exported maps
              abdyears: the year of abandonment that you want to map
              crop: the class code for the crop
              assetId: the directory where you store your annual land cover map, the folder should only include land cover maps
              MMU: minimum mapping unit
*/

//Get the regional boundary
var NUTS=ee.FeatureCollection('projects/ee-hyinhe/assets/He/SILVIS/Eastern_Europe/East_Europe_boundary_NUTS2_v3
                              
//Set the output path and name
var despt1='EEurope_abandonment'
var despt1_1='He/Eastern_Europe/EEurope_abandonment'

var abdyears = ee.List(["1990","1991","1992","1993","1994","1995","1996",
                        "1997","1998","1999","2000","2001","2002","2003",
                        "2004","2005","2006","2007","2008","2009","2010",
                        "2011","2012",'2013','2014','2015','2016']);

//Which class is cropland in your map?
var crop=3
 
//Set the path to the land cover maps. The folder should only include land cover maps, nothing else
var assetId='users/hyinhe/Europe_landcover'

//Set the minimum mapping unit
var MMU_change=11
 
//Make a list that contains all the imagery in the asset directory
var assetList = ee.List(ee.data.getList({'id':assetId}))
print(assetList) 

//Get the number of land cover maps
var n=assetList.size().getInfo()

//Set up the color scheme
var viz = {min:1988, max:2013, palette:['ffffff','0000FF','FDFF92','FF2700','d600ff']};

//Generate a imagery collection that contains all the land cover maps on the list
var listocollection = function(assetList,size){
  var col=ee.ImageCollection([]);
  for (var i=0; i<size; i++){
    var value=ee.Dictionary(assetList.get(i))
    var imgID=ee.String(value.get('id')).getInfo()
    var imgs=ee.Image(imgID)
    col=col.merge(imgs)
  }
  return col;
}
var listocollection4 = function(assetList){
  var col=ee.ImageCollection([]);
  for (var i=0; i<2; i++){
    var value=ee.Dictionary(assetList.get(i))
    var imgID=ee.String(value.get('id')).getInfo()
    var imgs=ee.Image(imgID)
    col=col.merge(imgs)
  }
  return col;
}
var result=listocollection(assetList,n);
print(result,'Land cover maps in the Assets')
var crop4=listocollection4(assetList,n);

//Get the name of the land cover map and take the last four digits as the name of the band. Depending the name of the files, "strlength" can be adjusted
var bandnamechange=function(img){
    var imgname=img.get('system:id')
    var names=ee.String(imgname)
    var strlength=names.length()
    var strlength2=strlength.subtract(4)
    var myYear = names.slice(36,40);
    return img.rename(myYear)
}
var landcover=result.map(bandnamechange)
print(landcover, 'Land cover maps in the Assets (new band name)')

//Convert the imagery collection to a multi-band imagery
var stackCollection = function(collection) {
  var first = ee.Image(collection.first()).select([]);
  var appendBands = function(image, previous) {
    return ee.Image(previous).addBands(image);
  };
  return ee.Image(collection.iterate(appendBands, first));
};
var annualmap = stackCollection(landcover)
var map1985=ee.Image('users/hyinhe/Europe_landcover/Class_1986').rename('1985')

annualmap=map1985.addBands(annualmap)
print(annualmap,'Land cover map stack')

Map.centerObject(annualmap,8)

var extent=annualmap.geometry()
//print(extent)
Map.addLayer(annualmap,{bands:['1988','2002','2017'],min:1,max:4},'land cover maps (1987-2002-2017)')

//print(annualmap)

//Convert land cover map to cropmap (1: cropland, 2: noncropland)
var cropmap=annualmap.eq(crop)
Map.addLayer(cropmap,{bands:['1988','2002','2017'],min:0,max:1},'land cover maps (1987-2002-2017)')

//******************************************First filtering***********************************************************
//filter 1 year data with 2 before ADN after same land cover. E.G. 11011 would become 11111

var yearlist2 = ee.List(['1988','1989',"1990","1991","1992","1993","1994","1995","1996",
                        "1997","1998","1999","2000","2001","2002","2003",
                        "2004","2005","2006","2007","2008","2009","2010",
                        "2011","2012",'2013','2014','2015','2016','2017','2018']);

var fiters=function(annualmap,band){
  var current_year = ee.Number.parse(band);
  
  var year_after1 = ee.Number.parse(band).add(1);
  var year_after2 = ee.Number.parse(band).add(2);

  var year_before1 = ee.Number.parse(band).subtract(1);
  var year_before2 = ee.Number.parse(band).subtract(2);

  var d0 = ee.Date.fromYMD(current_year,1,1).format('YYYY');
  var d1 = ee.Date.fromYMD(year_after1,1,1).format('YYYY');
  var d2 = ee.Date.fromYMD(year_after2,1,1).format('YYYY');

  var dd1 = ee.Date.fromYMD(year_before1,1,1).format('YYYY');
  var dd2 = ee.Date.fromYMD(year_before2,1,1).format('YYYY');

//var dd4 = ee.Date.fromYMD(abd_year_b4,1,1).format('YYYY');

var current=annualmap.select(d0)
var after1=annualmap.select(d1)
var after2=annualmap.select(d2)

var before1=annualmap.select(dd1)
var before2=annualmap.select(dd2)

var replace1 = current.where(before1.eq(0).and(before2.eq(0))
                           .and(after1.eq(0)).and(after2.eq(0)),0);
var replace2 = replace1.where(before1.eq(1).and(before2.eq(1))
                           .and(after1.eq(1)).and(after2.eq(1)),1);
  return replace2
}

//Apply the rule to all years
var fiteredmaps=ee.ImageCollection.fromImages(
          yearlist2.map(function(y){
            return fiters(cropmap,y);
          })  
  );
var filtered_stack = stackCollection(fiteredmaps);

print(filtered_stack, 'filtered_stack (first_filter)')

Map.addLayer(filtered_stack,{bands:['1988','2002','2017'],min:0,max:1},'filtered_stack (first_filter)')

var filtered_stack_all=filtered_stack.addBands(cropmap.select(['1985','1986','1987','2019','2020']))

print(filtered_stack_all,'filtered_stack_all')

//******************************************Second filtering***********************************************************
//filter 2 year consecutive data with 3 before ADN after same land cover. E.G. 11100111 would become 11110111
var yearlist3 = ee.List(['1989',"1990","1991","1992","1993","1994","1995","1996",
                        "1997","1998","1999","2000","2001","2002","2003",
                        "2004","2005","2006","2007","2008","2009","2010",
                        "2011","2012",'2013','2014','2015','2016']);

var fiters2=function(annualmap,band){
  var current_year = ee.Number.parse(band);
  
  var year_after1 = ee.Number.parse(band).add(1);
  var year_after2 = ee.Number.parse(band).add(2);
  var year_after3 = ee.Number.parse(band).add(3);
  var year_after4 = ee.Number.parse(band).add(4);

  var year_before1 = ee.Number.parse(band).subtract(1);
  var year_before2 = ee.Number.parse(band).subtract(2);
  var year_before3 = ee.Number.parse(band).subtract(3);

  var d0 = ee.Date.fromYMD(current_year,1,1).format('YYYY');
  var d1 = ee.Date.fromYMD(year_after1,1,1).format('YYYY');
  var d2 = ee.Date.fromYMD(year_after2,1,1).format('YYYY');
  var d3 = ee.Date.fromYMD(year_after3,1,1).format('YYYY');
  var d4 = ee.Date.fromYMD(year_after4,1,1).format('YYYY');

  var dd1 = ee.Date.fromYMD(year_before1,1,1).format('YYYY');
  var dd2 = ee.Date.fromYMD(year_before2,1,1).format('YYYY');
  var dd3 = ee.Date.fromYMD(year_before3,1,1).format('YYYY');

var current=annualmap.select(d0)
var after1=annualmap.select(d1)
var after2=annualmap.select(d2)
var after3=annualmap.select(d3)
var after4=annualmap.select(d4)
var before1=annualmap.select(dd1)
var before2=annualmap.select(dd2)
var before3=annualmap.select(dd3)

var replace1 = current.where(before1.eq(0).and(before2.eq(0))
                           .and(after1.eq(0)).and(after2.eq(0)),0);
var replace2 = replace1.where(before1.eq(1).and(before2.eq(1))
                           .and(after1.eq(1)).and(after2.eq(1)),1);
var replace3 = replace2.where(replace2.eq(after1).and(before1.eq(0)).and(before2.eq(0))
                           .and(before3.eq(0)).and(after2.eq(0))
                           .and(after3.eq(0)).and(after4.eq(0)),0);
var replace4 = replace3.where(replace3.eq(after1).and(before1.eq(1)).and(before2.eq(1))
                           .and(before3.eq(1)).and(after2.eq(1))
                           .and(after3.eq(1)).and(after4.eq(1)),1);

  return replace4
}

//Apply the rule to all years
var fiteredmaps2=ee.ImageCollection.fromImages(
          yearlist3.map(function(y){
            return fiters2(filtered_stack_all,y);
          })  
  ); 
var filtered_stack2 = stackCollection(fiteredmaps2);

print(filtered_stack2, 'filtered_stack2 (second filter)')

Map.addLayer(filtered_stack2,{bands:['1989','2002','2016'],min:0,max:1},'filtered_stack2')


//******************************************Third filtering***********************************************************
//filter 2 year consecutive data with 3 before ADN after same land cover. E.G. 11110111 would become 11111111

var filtered_stack_all2=filtered_stack2
                    .addBands(filtered_stack_all.select(['1985','1986','1987','1988','2017','2018','2019','2020']))
                   // .addBands(annualmap.select(['1986','1987','2019','2020']))
print(filtered_stack_all2,'filtered_stack_all2')

//Apply the rule to all years
var fiteredmaps3=ee.ImageCollection.fromImages(
          yearlist2.map(function(y){
            return fiters(filtered_stack_all2,y);
          })  
  );
var filtered_stack3 = stackCollection(fiteredmaps3);

print(filtered_stack3, 'filtered_stack3 (thrid filter)')
Map.addLayer(filtered_stack3,{bands:['1988','2002','2017'],min:0,max:1},'land cover maps filtered3')

var filtered_stack_final=filtered_stack3.addBands(cropmap.select(['1985','1986','1987','2019','2020']))
Map.addLayer(filtered_stack_final,{bands:['1988','2002','2017'],min:0,max:1},'land cover maps filtered_final')
print(filtered_stack_final,'filtered_stack_final')


//******************************************Abandonment Mapping***********************************************************
//Create the 5-year rule: if a pixel is active crop for more than 3 years out of 5, then not active in the next 5 years, then it is abandonment
var aband=function(cropmap,band){
var abd_year = ee.Number.parse(band);
  var abd_year_1 = ee.Number.parse(band).add(1);
  var abd_year_2 = ee.Number.parse(band).add(2);
  var abd_year_3 = ee.Number.parse(band).add(3);
  var abd_year_4 = ee.Number.parse(band).add(4);

  var abd_year_b1 = ee.Number.parse(band).subtract(1);
  var abd_year_b2 = ee.Number.parse(band).subtract(2);
  var abd_year_b3 = ee.Number.parse(band).subtract(3);
  var abd_year_b4 = ee.Number.parse(band).subtract(4);
  var abd_year_b5 = ee.Number.parse(band).subtract(5);

  var d0 = ee.Date.fromYMD(abd_year,1,1).format('YYYY');
  var d1 = ee.Date.fromYMD(abd_year_1,1,1).format('YYYY');
  var d2 = ee.Date.fromYMD(abd_year_2,1,1).format('YYYY');
  var d3 = ee.Date.fromYMD(abd_year_3,1,1).format('YYYY');
  var d4 = ee.Date.fromYMD(abd_year_4,1,1).format('YYYY');

  var dd1 = ee.Date.fromYMD(abd_year_b1,1,1).format('YYYY');
  var dd2 = ee.Date.fromYMD(abd_year_b2,1,1).format('YYYY');
  var dd3 = ee.Date.fromYMD(abd_year_b3,1,1).format('YYYY');
  var dd4 = ee.Date.fromYMD(abd_year_b4,1,1).format('YYYY');
  var dd5 = ee.Date.fromYMD(abd_year_b5,1,1).format('YYYY');

  var crop_frequency1=cropmap.select(dd1).eq(1)
  var crop_frequency2=cropmap.select(dd2).eq(1)
  var crop_frequency3=cropmap.select(dd3).eq(1)
  var crop_frequency4=cropmap.select(dd4).eq(1)
  var crop_frequency5=cropmap.select(dd5).eq(1)

  var crop_frequency=crop_frequency1.add(crop_frequency2).add(crop_frequency3).add(crop_frequency4).add(crop_frequency5)

  //Before Abandonment, there should be at least 4 years out of 5 active use of cropland, that's why the frequency was set to greater than 2
  var abdresult=crop_frequency.gt(3)
              .and(cropmap.select(dd1).eq(1))
              .and(cropmap.select(d0).neq(1))
              .and(cropmap.select(d1).neq(1))
              .and(cropmap.select(d2).neq(1))
              .and(cropmap.select(d3).neq(1))
              .and(cropmap.select(d4).neq(1))
              .multiply(abd_year).rename('abd')
  return abdresult
};

//Apply the rule to all years
var abandonment=ee.ImageCollection.fromImages(
          abdyears.map(function(y){
            return aband(filtered_stack_final,y);
          })  
  );

//*******************************************add abdnonment for 2017-2019****************************************
var land2013=filtered_stack_final.select('2013');
var land2014=filtered_stack_final.select('2014');
var land2015=filtered_stack_final.select('2015');
var land2016=filtered_stack_final.select('2016');
var land2017=filtered_stack_final.select('2017');
var land2018=filtered_stack_final.select('2018');
var land2019=filtered_stack_final.select('2019');
var land2020=filtered_stack_final.select('2020');

var aband2017=land2013.eq(1).and(land2014.eq(1)).and(land2015.eq(1)).and(land2016.eq(1))
              .and(land2017.neq(1)).and(land2018.neq(1)).and(land2019.neq(1)).and(land2020.neq(1))
              .multiply(2017).rename('abd')             
             
var aband2018=land2014.eq(1).and(land2015.eq(1)).and(land2016.eq(1)).and(land2017.eq(1))
              .and(land2018.neq(1)).and(land2019.neq(1)).and(land2020.neq(1))
              .multiply(2018).rename('abd')  
             
var aband2019=land2015.eq(1).and(land2016.eq(1)).and(land2017.eq(1)).and(land2018.eq(1))
              .and(land2019.neq(1)).and(land2020.neq(1))
              .multiply(2019).rename('abd')  

var abandCollection=abandonment.merge(aband2017).merge(aband2018).merge(aband2019)

var abandonment_map = stackCollection(abandCollection);

//Visualize the abandonment maps
//var abandonment_map=abandonment_stack   

//Generate the first abandonment event
var abamasked=abandonment_map.selfMask()
var abd1=abamasked.reduce(ee.Reducer.min())

//******************************************Create cropland mask***********************************************************
//The result is: stable_crop_D3: 1, no-cropland; 2, stable cropland; 3, fallow

var crop_freq=cropmap.reduce(ee.Reducer.sum()) 

//Select the pixels that have a frequency of more than 4 years as the extent of cropland
var crop_all=crop_freq.gt(4)
Map.addLayer(crop_all,{palette:['white','red']},'crop_unmasked')

//Get the frequency that were larger than 4 years
var crop_freq2=crop_all.multiply(crop_freq)

//Definitions: define stable cropland as those areas that are classified as cropland in n-5 years
//////// Note: this defination is different from the one use before, which is n-2 years
//The result is: stable_crop_D3: 1, no-cropland; 2, stable cropland; 3, fallow
var crop_freqC=crop_freq2.where(crop_freq2.eq(0),1).where(crop_freq2.gt(n-5),2)
var stable_crop_D3=crop_freqC.where(crop_freqC.gt(2),3)

/////////////////////////////////Mapping abandonment///////////////////////////////////////
//Merge the cropland with abandonment classes
var allmap_D =stable_crop_D3.where(abd1.gt(1),abd1);

//Creat a water mask
var dataWater = ee.Image('JRC/GSW1_0/GlobalSurfaceWater');
var occurrence = dataWater.select('occurrence');
//select the area with water occurence more than 50
var waterMask = occurrence.gt(50).mask(1);
//Creat an urban mask
var dataUrban = ee.Image('JRC/GHSL/P2016/BUILT_LDSMT_GLOBE_V1');
var builtUp = dataUrban.select('built');
var urbanMask=builtUp.gt(2);
//Create a settlement mask
var DLR_WSF_WSF = ee.Image('DLR/WSF/WSF2015/v1');
var settle=DLR_WSF_WSF.eq(255)

var allmap_D3=allmap_D.where(waterMask.eq(1),1).where(urbanMask.eq(1),1).where(settle.eq(1),1);

/////////////////////////////////use cropland mask//////////////////////////////////

var crop_mask=ee.Image('projects/ee-hyinhe/assets/He/SILVIS/Eastern_Europe/Europe_cropland_mask_1986_1989')
crop_mask=crop_mask

var crop_1989=crop_mask
var allmap_D4=allmap_D3.multiply(crop_1989)

//MMU for the change class
var reclass_D3=allmap_D4.where(allmap_D4.gt(40),4);
var abandclass_D3=allmap_D4.gt(40).multiply(allmap_D4).selfMask();
var patchsize_D3=reclass_D3.connectedPixelCount(MMU_change,false);
var dialation_D3=reclass_D3.focal_mode({
  radius:5,
  kernelType:'square',
  units:'pixels',
  iterations:1
});

var dialation_abd_D3=abandclass_D3.focal_mode({
  radius:5,
  kernelType:'square',
  units:'pixels',
  iterations:1
});
var result_D3=reclass_D3.where(patchsize_D3.lt(MMU_change),dialation_D3);
//Map.addLayer(result,viz3,'Reclass2')
var finalmap_D3=result_D3.where(result_D3.eq(4),dialation_abd_D3);
print(finalmap_D3);
 
finalmap_D3=finalmap_D3.clip(NUTS2).toDouble()

//Export final abandonment map
Export.image.toDrive({
  image: finalmap_D3,
  description: despt1,
  crs: "EPSG:32637",
  folder:'GEE',
  region: extent,
  scale: 30,
  maxPixels: 1e13
});
