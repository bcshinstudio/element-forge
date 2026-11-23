'use strict';
const {lesson}=require('./levels');

// Spaces between routes are deliberate. Each board is authored separately
// so the public pack does not inherit the generator's terrain substitutions.
const layouts=[
 ['Cinder Ford','Easy','Fire needs the lava ford. Water follows the river and detours around the lava.',[
  '###W#######','###=#######','...=.......','F..!...#..f','...=.......','###=#######','###w#######'
 ],{tools:{intersection:1}},['lava','river','intersection']],
 ['Dry Junction','Easy','Keep Electricity on dry ground as Plant crosses from the grove.',[
  '#####E#####','#####.#####','##....#.###','N*........n','##..*.#.###','#####.#####','#####e#####'
 ],{tools:{intersection:1}},['forest','intersection']],
 ['Glasswater','Medium','Ice can cross the shallows. Electricity needs the dry ridge.',[
  '#####E#####','#####.#####','..#........','I._.......i','..^........','#####.#####','#####e#####'
 ],{tools:{intersection:1}},['intersection','shallow']],
 ['Sheltered Pass','Medium','Light and Shadow have separate approaches to the shared landing.',[
  '#####H#####','#####-#####','###..-..###','L..+...+..l','###..-..###','#####-#####','#####h#####'
 ],{tools:{intersection:1}},['intersection','exposed','covered']],
 ['Scree and Timber','Hard','Give the crossing to the current that can reach it without the bridge.',[
  '#####R#####','#####%#####','..#........','N.*..~.*..n','..#........','#####%#####','#####r#####'
 ],{tools:{bridge:1,intersection:1}},['forest','scree','bridge','intersection']],
 ['Kiln Junction','Hard','Metal can use the heated passage. Fire needs the lava approach.',[
  '#####M#####','#####^#####','####.&.####','F..!....!.f','####.^.####','#####&#####','#####m#####'
 ],{tools:{intersection:1}},['heated','abrasive','lava','intersection']],
 ['Grove Overlook','Expert','Plan both crossings before spending the intersection budget.',[
  '###E###R###','###.###%###','..#........','N.*.......n','..#........','###.###%###','###e###r###'
 ],{tools:{intersection:3},budget:2,prices:{intersection:1}},['forest','scree','intersection']]
];

function stages(){
 return layouts.map(([name,difficulty,description,rows,options,requires])=>{
  const stage=lesson(name,description,rows,{...options,requires});
  return {...stage,difficulty,hint:'Check each current’s legal approaches before committing tools.'};
 });
}
module.exports={stages};
