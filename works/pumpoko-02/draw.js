/* PUMPOKO's ending fruit, adapted once from Y-down miniature art to Y-up
 * WORLD LOOP bodies. All poses here are visual; contact circles stay immutable. */
(function(root){
  'use strict';
  const TAU=Math.PI*2;
  function ellipse(c,x,y,rx,ry,color){
    c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();
  }
  function pumpkin(c,b,size=1){
    c.save();c.translate(b.x,b.y-4*size);c.rotate(-b.angle);c.scale(2.15*size,-2.15*size);
    // Exact original stage-draw fruit silhouette, palette and broad lobes.
    c.beginPath();c.moveTo(0,-12);
    c.bezierCurveTo(8,-18,20,-12,20,-1);c.bezierCurveTo(21,9,11,16,0,13);
    c.bezierCurveTo(-11,16,-21,9,-20,-1);c.bezierCurveTo(-20,-12,-8,-18,0,-12);c.closePath();
    const body=c.createLinearGradient(-12,-14,12,15);
    body.addColorStop(0,'#ffc574');body.addColorStop(.55,'#f5ac56');body.addColorStop(1,'#e59445');
    c.fillStyle=body;c.fill();c.save();c.clip();
    c.beginPath();c.ellipse(-10,0,9,15,-.10,0,TAU);c.fillStyle='rgba(255,215,142,.30)';c.fill();
    c.beginPath();c.ellipse(2,1,9,15,0,0,TAU);c.fillStyle='rgba(255,198,112,.38)';c.fill();
    const shade=c.createLinearGradient(0,2,0,16);
    shade.addColorStop(0,'rgba(107,77,38,0)');shade.addColorStop(1,'rgba(107,77,38,.16)');
    c.fillStyle=shade;c.fillRect(-22,-18,44,36);c.restore();
    c.beginPath();c.moveTo(-2,-12);c.quadraticCurveTo(-4,-18,1+(b.artId||0)%2,-20);
    c.strokeStyle='#536c4d';c.lineWidth=4.5;c.lineCap='round';c.stroke();
    c.beginPath();c.ellipse(-6,-7,3.8,2.2,-.45,0,TAU);c.fillStyle='rgba(255,233,183,.48)';c.fill();c.restore();
  }
  function leaf(c,x,y,size,angle,color){
    c.save();c.translate(x,y);c.rotate(angle);c.scale(size,-size);
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-7,-9,0,-17,10,-16);
    c.bezierCurveTo(24,-16,24,-3,14,1);c.bezierCurveTo(8,4,3,2,0,0);
    c.fillStyle=color;c.fill();c.restore();
  }
  function rutabaga(c,b){
    c.save();c.translate(b.x,b.y);c.rotate(-b.angle*.7);
    c.scale(1+b.pulse*.13-b.stretch*.4,1-b.pulse*.13+b.stretch);
    // A round shoulder and softly tapered cream bulb; no vein/rib outlines.
    c.beginPath();c.moveTo(-4,32);
    c.bezierCurveTo(-25,36,-37,20,-33,0);c.bezierCurveTo(-31,-20,-14,-31,-2,-32);
    c.bezierCurveTo(13,-30,30,-20,33,-1);c.bezierCurveTo(37,19,19,34,-4,32);c.closePath();
    const cream=c.createLinearGradient(-20,5,18,-32);
    cream.addColorStop(0,'#f4e7c4');cream.addColorStop(1,'#dbc795');c.fillStyle=cream;c.fill();
    c.save();c.clip();
    c.beginPath();c.moveTo(-39,40);c.lineTo(40,40);c.lineTo(40,8);
    c.bezierCurveTo(16,-1,-2,12,-18,8);c.quadraticCurveTo(-31,5,-39,14);c.closePath();
    const purple=c.createLinearGradient(-25,35,24,5);
    purple.addColorStop(0,'#b99bb0');purple.addColorStop(1,'#97728f');c.fillStyle=purple;c.fill();
    ellipse(c,-15,15,12,22,'rgba(238,211,223,.19)');ellipse(c,4,-9,13,19,'rgba(255,249,223,.20)');
    c.restore();
    c.beginPath();c.moveTo(-2,-31);c.quadraticCurveTo(-4,-37,1,-39);
    c.strokeStyle='#ccb784';c.lineWidth=2.8;c.lineCap='round';c.stroke();
    c.beginPath();c.moveTo(-3,30);c.quadraticCurveTo(-4,38,0,40);
    c.strokeStyle='#536f49';c.lineWidth=3.5;c.stroke();
    leaf(c,-1,38,.47,.2,'#738b59');leaf(c,0,38,.38,2.5,'#536f49');c.restore();
  }
  function nursery(c,poses,world){
    if(!poses)return;
    for(const p of poses.plants){
      // Keep the planted companions in place. Only the real hero can depart.
      const departure=p.hero?Math.max(0,1-Math.abs(world.entities[0].x-p.x)/45):1;
      if(p.sprout>0){
        // Original ending growth: upright shoot relaxes into a low vine;
        // leaves open before the original overshooting fruit swell.
        c.beginPath();c.moveTo(p.x,p.ground-1);
        c.quadraticCurveTo(p.x,p.ground+10*p.sprout,p.x,p.ground+2-p.leaves);
        c.strokeStyle='#536f49';c.lineWidth=2+p.leaves*.8;c.lineCap='round';c.stroke();
        leaf(c,p.x-4,p.ground+5,(.28*p.sprout+.40*p.leaves)*2.15*p.scale*departure,.5,'#738b59');
        leaf(c,p.x+5,p.ground+7,(.24*p.sprout+.38*p.leaves)*2.15*p.scale*departure,2.5,'#536f49');
      }
      if(p.grow>0&&(!p.hero||poses.opening)){
        const size=p.scale*p.grow,b=p.hero?world.entities[0]:p;
        const y=p.ground+(b.y-p.ground)*p.grow;
        ellipse(c,p.x,p.ground+2,36*size,3,'rgba(90,68,38,.13)');
        pumpkin(c,{...b,x:p.x,y,angle:0,artId:p.id},size);
      }
    }
    for(const p of poses.seeds){
      if(p.alpha<=0)continue;
      c.save();c.globalAlpha*=p.alpha;c.translate(p.x,p.y);c.rotate(p.angle);c.scale(p.sx,-p.sy);
      root.PumpokoTitleArt.seed(c,{x:0,y:0,angle:0},p.id,1);c.restore();
    }
  }
  root.FruitLabArt={pumpkin,rutabaga,ellipse,nursery};
})(typeof window!=='undefined'?window:globalThis);
