/*Author:He Yin
  Date:20-April-2023
  Purpose: 1. Count the frequency of cropland
           2. Label cropland re-cutlivation from land cover map series and abandonment map
           Abandonment defination: a cropland pixel that is 3 years out of 5 active followed by 5 year non-active
           Recultivation defination: a cropland pixel that is 5 years inactive followed by 4 year active

  Abandonment definition: http://www.fao.org/ag/agn/nutrition/Indicatorsfiles/Agriculture.pdf
  
  Class codes in the results: 4: permanent abandonment; 1995-2017, the timing of recultivation
  
  Parameters: 
              despt*:the name of exported maps
              abandonment_map: abandonment map generated
              recultyears: the year of recultivation that you want to map
              crop: the class code for the crop
              assetId: the directory where you store your annual land cover map, the folder should only include land cover maps
              MMU: minimum mapping unit
*/
 
var despt1='EEurope_recultivation'
var despt1_1='He/Eastern_Europe/EEurope_recultivation'

//******************************************Load abandonment map***********************************************************
var abandonment_map=ee.Image('projects/ee-hyinhe/assets/He/SILVIS/Eastern_Europe/EEurope_abandonment')

var recultyears = ee.List(["1995","1996","1997","1998","1999","2000","2001","2002","2003",
                        "2004","2005","2006","2007","2008","2009","2010",
                        "2011","2012",'2013','2014','2015','2016','2017']);

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

//Get the name of the land cover map and take the last four digits as the name of the band
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
//print(annualmap,'Land cover map stack')

Map.centerObject(annualmap,8)

var extent=annualmap.geometry()
//print(extent)
Map.addLayer(annualmap,{bands:['1988','2002','2017'],min:1,max:4},'land cover maps (1987-2002-2017)')

print(annualmap)

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

var filtered_stack_all=filtered_stack.addBands(cropmap.select(['1986','1987','2019','2020']))

print(filtered_stack_all,'filtered_stack (first filter)')
 
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
                    .addBands(filtered_stack_all.select(['1986','1987','1988','2017','2018','2019','2020']))
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

var filtered_stack_final=filtered_stack3.addBands(cropmap.select(['1986','1987','2019','2020']))
Map.addLayer(filtered_stack_final,{bands:['1988','2002','2017'],min:0,max:1},'land cover maps filtered_final')


//******************************************Recultivation Mapping***********************************************************
//Create the 5-year rule: if a pixel is non-active crop for 5 years, then active in the next 4 years, then it is recultivation
var recult=function(cropmap,band){
  var reclt_year = ee.Number.parse(band);
  var reclt_year_1 = ee.Number.parse(band).add(1);
  var reclt_year_2 = ee.Number.parse(band).add(2);
  var reclt_year_3 = ee.Number.parse(band).add(3);
//  var reclt_year_4 = ee.Number.parse(band).add(4);

  var reclt_year_b1 = ee.Number.parse(band).subtract(1);
  var reclt_year_b2 = ee.Number.parse(band).subtract(2);
  var reclt_year_b3 = ee.Number.parse(band).subtract(3);
  var reclt_year_b4 = ee.Number.parse(band).subtract(4);
  var reclt_year_b5 = ee.Number.parse(band).subtract(5);
  
var d0 = ee.Date.fromYMD(reclt_year,1,1).format('YYYY');
var d1 = ee.Date.fromYMD(reclt_year_1,1,1).format('YYYY');
var d2 = ee.Date.fromYMD(reclt_year_2,1,1).format('YYYY');
var d3 = ee.Date.fromYMD(reclt_year_3,1,1).format('YYYY');
//var d4 = ee.Date.fromYMD(reclt_year_4,1,1).format('YYYY');

var dd1 = ee.Date.fromYMD(reclt_year_b1,1,1).format('YYYY');
var dd2 = ee.Date.fromYMD(reclt_year_b2,1,1).format('YYYY');
var dd3 = ee.Date.fromYMD(reclt_year_b3,1,1).format('YYYY');
var dd4 = ee.Date.fromYMD(reclt_year_b4,1,1).format('YYYY');
var dd5 = ee.Date.fromYMD(reclt_year_b5,1,1).format('YYYY');

//Before recultivation, there should be at least 5 years non-active use of cropland
var crop_frequency1=cropmap.select(dd1).neq(1)
var crop_frequency2=cropmap.select(dd2).neq(1)
var crop_frequency3=cropmap.select(dd3).neq(1)
var crop_frequency4=cropmap.select(dd4).neq(1)
var crop_frequency5=cropmap.select(dd5).neq(1)
var crop_frequency=crop_frequency1.add(crop_frequency2).add(crop_frequency3).add(crop_frequency4).add(crop_frequency5)

var recult_frequency1=cropmap.select(d0).eq(1)
var recult_frequency2=cropmap.select(d1).eq(1)
var recult_frequency3=cropmap.select(d2).eq(1)
var recult_frequency4=cropmap.select(d3).eq(1)
//var recult_frequency5=cropmap.select(d4).eq(1)
var recult_frequency=recult_frequency1.add(recult_frequency2).add(recult_frequency3).add(recult_frequency4)//.add(crop_frequency5)

  var recultresult=crop_frequency.eq(5)
              .and(cropmap.select(d0).eq(1))
              .and(recult_frequency.gt(2))
              .multiply(reclt_year).rename('recult')
  return recultresult
};

//Apply the rule to all years
var recultivation=ee.ImageCollection.fromImages(
          recultyears.map(function(y){
            return recult(filtered_stack_final,y);
          })  
  );

//*******************************************add recultivation for 2018-2019****************************************
var land2013=filtered_stack_final.select('2013')//.mask(cropmask);
var land2014=filtered_stack_final.select('2014')//.mask(cropmask);
var land2015=filtered_stack_final.select('2015')//.mask(cropmask);
var land2016=filtered_stack_final.select('2016')//.mask(cropmask);
var land2017=filtered_stack_final.select('2017')//.mask(cropmask);
var land2018=filtered_stack_final.select('2018')//.mask(cropmask);
var land2019=filtered_stack_final.select('2019')//.mask(cropmask);
var land2020=filtered_stack_final.select('2020')//.mask(cropmask);

var recult2018=land2013.neq(1).and(land2014.neq(1)).and(land2015.neq(1)).and(land2016.neq(1)).and(land2017.neq(1))
              .and(land2018.eq(1)).and(land2019.eq(1)).and(land2020.eq(1))
              .multiply(2018).rename('recult')  
             
var recult2019=land2014.neq(1).and(land2015.neq(1)).and(land2016.neq(1)).and(land2017.neq(1)).and(land2018.neq(1))
              .and(land2019.eq(1)).and(land2020.eq(1))
              .multiply(2019).rename('recult')  

var recultCollection=recultivation.merge(recult2018).merge(recult2019)

var recult_map = stackCollection(recultCollection);

///////////////////////Generate the first recultivation event
var recultmasked=recult_map.selfMask()
var recult1=recultmasked.reduce(ee.Reducer.min())

//////////////////Generate the third recultivation first
var s_recult=recult_map.reduce(ee.Reducer.sum())
var s_recult_mask3=s_recult.gt(5970)
var s_recult_masked3=recult_map.mask(s_recult_mask3)
var recult3=s_recult_masked3.reduce(ee.Reducer.max())
//Map.addLayer(abd3,viz,'Third_abandonment (before applying MMU)')

/////////////////////Generate the second abandonment (modified), after removing the 1st and 3rd abandonment
var recult2_1=s_recult.subtract(recult1.unmask()).subtract(recult3.unmask()).selfMask()
var recult2=recult2_1.where(recult2_1.lt(1995),3)

//In abandonment map: stable_crop_D3: 1, no-cropland; 2, stable cropland; 3, fallow
var reclass_aband=abandonment_map.where(abandonment_map.gt(3),4)

var recult1_abandExtent=recult1.multiply(reclass_aband.eq(4))
//In recultivation map: stable_crop_D3: 1, no-cropland; 2, stable cropland; 3, fallow; 4: uncultivated abandonment; 1995 etc. recultivation year

//MMU for the change class 
var reclass_D3=reclass_aband.where(recult1_abandExtent.gt(0),5);
var recultclass_D3=recult1_abandExtent.gt(0).multiply(recult1_abandExtent).selfMask();
var patchsize_D3=reclass_D3.connectedPixelCount(MMU_change,false);
var dialation_D3=reclass_D3.focal_mode({
  radius:5,
  kernelType:'square',
  units:'pixels',
  iterations:1
});

var dialation_recult_D3=recultclass_D3.focal_mode({
  radius:5,
  kernelType:'square',
  units:'pixels',
  iterations:1
});
var result_D3=reclass_D3.where(patchsize_D3.lt(MMU_change),dialation_D3);
//Map.addLayer(result,viz3,'Reclass2')
var finalmap_D3=result_D3.where(result_D3.eq(5),dialation_recult_D3);
print(finalmap_D3);

Export.image.toAsset({
    image: finalmap_D3,
    description: despt1,
    assetId:despt1_1,
    scale: 30,
   //region: geometry,
    region: extent,
    maxPixels: 1e13,
  });

finalmap_D3=finalmap_D3.clip(NUTS2).toDouble()

Export.image.toDrive({
  image: finalmap_D3,
  description: despt1,
  crs: "EPSG:32637",
  folder:'GEE',
  region: extent,
  scale: 30,
  maxPixels: 1e13
});

