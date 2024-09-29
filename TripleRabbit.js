"use strict"

/* -------------------- ### Constant -------------------- */
const WindowWidth = window.innerWidth;
const WindowHeight = window.innerHeight; 
console.log(WindowWidth, WindowHeight);

const GameContainerHeight = WindowHeight * 0.98;
const GameContainerWidth = GameContainerHeight * 0.6;
console.log(GameContainerWidth, GameContainerHeight);

const BlockRowNumber = 6;
const BlockColumnNumber = 6;
const BlockNumber = BlockRowNumber * BlockColumnNumber;
const BlockSideLength = GameContainerWidth / BlockColumnNumber;

const BlockContainerWidth = GameContainerWidth;
const BlockContainerHeight = (BlockContainerWidth / BlockColumnNumber) * BlockRowNumber; // Reason: we want to decide the size of blockContainer after the number of blocks adjusted
console.log(BlockContainerWidth, BlockContainerHeight);

const OptionContainerWidth = GameContainerWidth;
const OptionContainerHeight = GameContainerHeight * 0.2;
console.log(OptionContainerWidth, OptionContainerHeight);

const ItemName = [
    "GRASS", "BUSH", "TREE", "HOUSE", "CASTLE",
    "RABBIT", "G8RABBIT", "CARROT", "CARROTS", 
    "COIN", "CRYSTAL", "HAMMER"
];

/* 100 in total */
const Possibility = [
    45, 25, 10, 5, 0, 
    7, 3, 0, 0,
    0, 3, 2 
];

const Points = [
    0, 10, 50, 300, 2000, 
    0, 0, 100, 1000,
    3000, 0, 0 
];

const ItemToNumber = {
    "GRASS" : 0, "BUSH" : 1, "TREE" : 2, "HOUSE" : 3, "CASTLE" : 4,
    "RABBIT" : 5, "G8RABBIT" : 6, "CARROT" : 7, "CARROTS" : 8, 
    "COIN" : 9, "CRYSTAL" : 10, "HAMMER" : 11
};

const CrystalCombinePriorty = ["CARROTS", "CARROT", "HOUSE", "TREE", "BUSH", "GRASS"];

const Dir = [-BlockColumnNumber, BlockColumnNumber, -1, 1]; // up, down, left, right

/* -------------------- ### Class -------------------- */

class Block{
    constructor(index){
        this.node = document.createElement("div");
        this.node.id = `block${index}`;
        this.node.className = "block";
        this.index = index;
        this.item = "none"; // default item: "none"
    }

    /* Remove the image of the block */
    resetBlock(){
        this.item = "none";
        if(this.node.firstChild){
            this.node.removeChild(this.node.firstChild);
        }
    }

    /* Update the information of the block and the image according to "item" */
    updateImage(item){
        this.item = item;
        if(this.node.firstChild){
            this.node.removeChild(this.node.firstChild);
        }
        if(this.item != "none"){
            this.node.appendChild(imgs[this.item][this.index]);
        }
    }

    /* Indicate what event should happan when block clicking by the mouse */
    changeTypeByClick(){
        console.log("------------------------------");
        console.log(itemPool[currImgIndex], this.index);
        /* 1. Put the item down and check upgrading */
        if(this.item == "none"){
            switch(itemPool[currImgIndex]){ // e.g. "GRASS" (type: string)
                case "GRASS":
                case "BUSH":
                case "TREE":
                case "HOUSE":
                    // It may combine and upgrade twice successively
                    this.item = itemPool[currImgIndex];
                    while(this.bfsForCombination(this.item)){
                        this.upgrade();
                    }
                    this.updateImage(this.item);
                    break;

                case "RABBIT":
                    rabbitOrder.push(this.index);
                    this.updateImage(itemPool[currImgIndex]);
                    break;

                case "G8RABBIT":
                    G8rabbitOrder.push(this.index);
                    this.updateImage(itemPool[currImgIndex]);
                    break;

                case "CRYSTAL":
                    let isUpgraded = false;
                    for(let item of CrystalCombinePriorty){
                        isUpgraded = this.bfsForCombination(item);
                        if(isUpgraded){
                            this.item = item;
                            this.upgrade();
                            break;
                        }
                    }
                    if(!isUpgraded) this.item = "CARROT";
                    this.updateImage(this.item);
                    break;
                
                case "HAMMER":
                    this.updateImage("CARROT");
                    break;
        
                default:
                    break;
            }
        }

        /* 2. Items -> none by a hammer */
        else if(itemPool[currImgIndex] == 'HAMMER'){
            switch(this.item){
                case "RABBIT":
                    this.updateImage("CARROT");
                    maintainOrder("RABBIT", this.index, -1);
                    break;

                case "G8RABBIT":
                    this.updateImage("CARROTS");
                    maintainOrder("G8RABBIT", this.index, -1);
                    break;
                
                default:
                    this.updateImage("none");
                    break;
            }
        }

        /* 3. Carrots and coin -> points */
        else if(this.item == "CARROT" || this.item == "CARROTS" || this.item == "COIN"){
            this.addPoints(this.item);
            this.updateImage("none");
            setLocalStorage(); // store game information to the window.localstorage
            return;
        }

        /* If this click has no impact, return */
        else return;

        /* Count items */
        let g8r = []; 
        let r = [];
        let carrot = [];
        let carrots = [];
        let coin = [];
        let n = [];
        for(let i = 0; i < BlockNumber; i++){
            if(blocks[i].item == "G8RABBIT") g8r.push(i);
            else if(blocks[i].item == "RABBIT") r.push(i);
            else if(blocks[i].item == "CARROT") carrot.push(i);
            else if(blocks[i].item == "CARROTS") carrots.push(i);
            else if(blocks[i].item == "COIN") coin.push(i);
            else if(blocks[i].item == "none") n.push(i);
        }
        
        // console.log("g8r", g8r);
        // console.log("r", r);
        // console.log("carrot", carrot);
        // console.log("carrots", carrots);
        // console.log("coin", coin);
        // console.log("n", coin);

        /* 4. Game over or not */
        let isG8rabbitEscape = false;
        if(n.length == 0){
            isG8rabbitEscape = true;
            if(holdItem != "HAMMER" && itemPool[currImgIndex + 1] != "HAMMER"){
                if(r.length == 0 && g8r.length == 0 && carrot.length == 0 && carrots.length == 0 && coin.length == 0){
                    alert(`Game over!\nTotal points: ${points}!`);
                    return;
                }
            }
        }

        /* 5. Rabbits may escape or move to another block */
        this.g8rabbitEscapeOrMove(isG8rabbitEscape, g8r, n); 
        this.rabbitEscapeAndMove(r);
        
        /* 6. Prepare next item */
        currImgIndex++;
        if(currImgIndex == 100) resetItemPool();
        updateImageOfCurrItem();

        /* 7. Store game information to the window.localstorage */
        setLocalStorage();
    }

    /* Check if it needs to (upgrade and update neighbors) or (only put down and done) */
    bfsForCombination(targetItem){
        let isUpgraded = false;
        let queue = [this.index];
        let queueIndex = 0;
        let sameItemNumber = 0;
        let blocksWaitingForDelete = [];
        
        let visited = [];
        for(let i = 0; i < BlockNumber; i++){
            visited[i] = false;
        }
        visited[this.index] = true;

        while(queueIndex < queue.length){
            for(let i = 0; i < 4; i++){
                let neighbor = queue[queueIndex] + Dir[i]; //e.g. 26 (type: number)

                // 1. If the index of the block is out of the range => skip
                if(neighbor < 0 || neighbor >= BlockNumber) continue;

                // 2. Blocks in the first column and those in the last column are not neighbors
                if((queue[queueIndex] % BlockColumnNumber == 0) && (neighbor % BlockColumnNumber == 5)) continue; 
                if((queue[queueIndex] % BlockColumnNumber == 5) && (neighbor % BlockColumnNumber == 0)) continue; 

                // 3. If the block has been visited => skip
                if(visited[neighbor] == true) continue;
                
                // 4. If the block was "nothing", them it should not be changed in the whole process
                if(blocks[neighbor].item == "none") continue;

                // Otherwise
                if(blocks[neighbor].item == targetItem){
                    sameItemNumber++;
                    blocksWaitingForDelete.push(neighbor);
                    visited[neighbor] = true;
                    queue.push(neighbor);
                }
            } 
            queueIndex++;
        }
        
        /* The item clicked by mouse upgrade to be another item */
        if(sameItemNumber >= 2){
            isUpgraded = true;
            for(let neighbor of blocksWaitingForDelete){
                blocks[neighbor].updateImage("none");
            }
        }
        
        /* The item clicked by mouse just show up as it should be */
        else isUpgraded = false;
    
        return isUpgraded;
    }

    /* Check status of rabbits and G8rabbits */
    bfsForRabbit(i, rabbitType, visited, needToEscape, needToMove){
        if(visited[i]) return;
        let queue = [i];
        let queueIndex = 0;
        let rabbitWaiting = [];
        let neighborhood = [];
        while(queueIndex < queue.length){
            let temp = queue[queueIndex++];
            rabbitWaiting.push(temp);
            visited[temp] = true;
            for(let j = 0; j < 4; j++){
                let neighbor = temp + Dir[j];
                if(neighbor < 0 || neighbor >= BlockNumber) continue;
                if((temp % BlockColumnNumber == 0) && (neighbor % BlockColumnNumber == 5)) continue; 
                if((temp % BlockColumnNumber == 5) && (neighbor % BlockColumnNumber == 0)) continue; 
                if(blocks[neighbor].item == rabbitType && !visited[neighbor]) queue.push(neighbor); // push rabbit into queue if it haven't been visited
                if(blocks[neighbor].item != rabbitType) neighborhood.push(neighbor); // collect neighbors near rabbits
            }
        }
        console.log("neighborhood:", neighborhood);
        
        let isEscape = true;

        // For rabbits, if there's a space or a G8rabbit nearby, then they will not be scared to escape; otherwise, they will escape.
        if(rabbitType == "RABBIT"){
            for(let j of neighborhood){
                if(blocks[j].item == "none" || blocks[j].item == "G8RABBIT"){
                    isEscape = false;
                }
            }
        }
        
        // Key point: According to the rule, rabbits nearby will either escape or move together.
        if(isEscape){
            for(let k of rabbitWaiting) needToEscape.push(k);
            needToEscape.push(-1); // indicate the end of this group
        } 
        else for(let k of rabbitWaiting) needToMove.push(k);
    }

    /* Process needed for G8rabbits */
    g8rabbitEscapeOrMove(isG8rabbitEscape, g8r, n){
        // escape ("G8RABBIT" -> "CARROTS")
        if(isG8rabbitEscape){
            let visited = []; 
            let needToEscape = [];
            for(let i = 0; i < BlockNumber; i++) visited[i] = false;
            for(let i of g8r) this.bfsForRabbit(i, "G8RABBIT", visited, needToEscape, );
            console.log("g8rabbit needToEscape:", needToEscape);
            console.log("g8rabbitOrder:", G8rabbitOrder);

            for(let i = 0; i < needToEscape.length; i++){
                let group = [];
                while(i < needToEscape.length && needToEscape[i] != -1) group.push(needToEscape[i++]);
                // Can combine
                if(group.length >= 3){
                    let indexNeedToUpgrade = -1;
                    for(let g of group){
                        indexNeedToUpgrade = (indexNeedToUpgrade == -1) ? g : indexNeedToUpgrade;
                        // the lastest g8rabbit is the target for upgradation
                        if(G8rabbitOrder.indexOf(g) > G8rabbitOrder.indexOf(indexNeedToUpgrade)) indexNeedToUpgrade = g; 
                    }
                    console.log("g8rabbit indexNeedToUpgrade", indexNeedToUpgrade);
                    for(let g of group){
                        // "G8RABBIT" -> "COIN"
                        if(g == indexNeedToUpgrade){
                            
                            //fading out animation
                            blocks[g].node.firstChild.style.opacity = 1.0;
                            let reduceOpacityTimer = setInterval(reduceOpacityToItem, 25, g);
                            function reduceOpacityToItem(i){
                                let image = blocks[i].node.firstChild; 
                                let currentOp = getComputedStyle(image).getPropertyValue("opacity");
                                if(currentOp <= 0){ // console.log(i, "reduceOpacity");
                                    blocks[i].node.firstChild.style.opacity = 1.0;
                                    blocks[i].updateImage("COIN");
                                    localStorage.setItem(`blocks[${i}].item`, blocks[i].item); // need storing additionally since animation happens after setLocalStorage()
                                    clearInterval(reduceOpacityTimer);
                                    return;
                                } 
                                currentOp = `${parseFloat(currentOp) - 0.1}`; // remember to convert string to number for calculation
                                image.style.opacity = currentOp;
                            }
                        }
                        // "G8RABBIT" -> "none"
                        else blocks[g].updateImage("none");
                    }
                }
                // Can't combine
                else{
                    // "G8RABBIT" -> "CARROTS"
                    for(let g of group){
                        blocks[g].item = "CARROTS"; 
                        if(blocks[g].bfsForCombination(blocks[g].item)) blocks[g].item = "COIN"; // check upgradation

                        // fading out animation
                        blocks[g].node.firstChild.style.opacity = 1.0;
                        let reduceOpacityTimer = setInterval(reduceOpacityToItem, 25, g);
                        function reduceOpacityToItem(i){
                            let image = blocks[i].node.firstChild;
                            let currentOp = getComputedStyle(image).getPropertyValue("opacity");
                            if(currentOp <= 0){ console.log(i, "reduceOpacity");
                                image.style.opacity = 1.0;
                                blocks[i].updateImage(blocks[g].item);
                                localStorage.setItem(`blocks[${i}].item`, blocks[i].item); // need storing additionally since animation happens after setLocalStorage()
                                clearInterval(reduceOpacityTimer);
                                return;
                            } 
                            currentOp = `${parseFloat(currentOp) - 0.1}`; // remember to convert string to number for calculation
                            image.style.opacity = currentOp;
                        }
                    }
                }
                // Maintain rabbitOrder of those escaped rabbits
                for(let g of group) maintainOrder("G8RABBIT", g, -1);
            }
        }
        // move to another block
        else{
            // e.g. 
            // g8r = [1, 2, 3, 4], n = [5, 7]
            // candidate = [5, 7, -1, -1, -1, -1], after shuffling => [-1, 7, 5, -1, -1, -1]
            // actual mapping = [[2, 7], [3, 5]]
            //
            // This implementation is pretty redundant though, but it filters out mappings like [2, 2], which will cause problems during fading in/out.
            let indexMapping = {};
            let candidate = n;
            for(let i = 0; i < g8r.length; i++) candidate.push(-1);
            candidate = FisherYatesShuffle(candidate);
            for(let i = 0; i < g8r.length; i++) indexMapping[g8r[i]] = candidate[i];
            

            for(let i of g8r){ console.log("g8rabbit moves from", i, "to", indexMapping[i]);
                if(indexMapping[i] == -1) continue;
                let oldPosition = i;
                let newPosition = indexMapping[i]; 
    
                let reduceOpacityTimer; // don't know how to declare outside the function, since many blocks setinterval with the same timer will have problems
                let increaseOpacityTimer; // don't know how to declare outside the function, since many blocks setinterval with the same timer will have problems
    
                // the original block fading out animation
                blocks[oldPosition].node.firstChild.style.opacity = 1.0;
                reduceOpacityTimer = setInterval(reduceOpacityToItem, 25, oldPosition);
                function reduceOpacityToItem(i){ // console.log("reduce timer:", reduceOpacityTimer);
                    let image = blocks[i].node.firstChild; 
                    let currentOp = getComputedStyle(image).getPropertyValue("opacity");
                    if(currentOp <= 0){ console.log(i, "reduceOpacity");
                        blocks[i].node.firstChild.style.opacity = 1.0;
                        blocks[i].updateImage("none");
                        localStorage.setItem(`blocks[${i}].item`, blocks[i].item); // need storing additionally since animation happens after setLocalStorage() 
                        clearInterval(reduceOpacityTimer);
                        return;
                    } 
                    currentOp = `${parseFloat(currentOp) - 0.1}`; // remember to convert string to number for calculation
                    image.style.opacity = currentOp;
                }
    
                // new block fading in animation
                blocks[newPosition].updateImage("G8RABBIT");
                blocks[newPosition].node.firstChild.style.opacity = 0.0;
                increaseOpacityTimer = setInterval(increaseOpacityToItem, 25, newPosition);
                function increaseOpacityToItem(i){ // console.log("increase timer:", increaseOpacityTimer);
                    let image = blocks[i].node.firstChild;
                    let currentOp = getComputedStyle(image).getPropertyValue("opacity"); 
                    if(currentOp >= 1.0){ console.log(i, "increaseOpacity");
                        blocks[newPosition].node.firstChild.style.opacity = 1.0;
                        clearInterval(increaseOpacityTimer);
                        return;
                    } 
                    currentOp = `${parseFloat(currentOp) + 0.1}`; // remember to convert string to number for calculation
                    image.style.opacity = currentOp;
                }

                //maintain G8rabbitOrder
                maintainOrder("G8RABBIT", oldPosition, newPosition);
            }
        }
    }

    /* Process needed for rabbits */
    rabbitEscapeAndMove(r){
        let visited = []; 
        let needToEscape = [];
        let needToMove = [];
        for(let i = 0; i < BlockNumber; i++) visited[i] = false;
        for(let i of r) this.bfsForRabbit(i, "RABBIT", visited, needToEscape, needToMove);

        // escape ("RABBIT" -> "CARROT")
        // For those rabbits becoming carrots, we should check if they can combine with each other.
        for(let i = 0; i < needToEscape.length; i++){
            let group = [];
            while(i < needToEscape.length && needToEscape[i] != -1) group.push(needToEscape[i++]);
            
            // Can combine (the rabbit last appearing will upgrade to carrots and others will disappear)
            if(group.length >= 3){
                let indexNeedToUpgrade = -1;
                for(let g of group){
                    indexNeedToUpgrade = (indexNeedToUpgrade == -1) ? g : indexNeedToUpgrade;
                    if(rabbitOrder.indexOf(g) > rabbitOrder.indexOf(indexNeedToUpgrade)){ // the lastest rabbit is the target for upgradation
                        indexNeedToUpgrade = g;
                    }
                }
                console.log("indexNeedToUpgrade", indexNeedToUpgrade);
                for(let g of group){
                    // "RABBIT" -> "CARROTS" or "COIN"
                    if(g == indexNeedToUpgrade){
                        blocks[g].item = "CARROTS"; 
                        if(blocks[g].bfsForCombination(blocks[g].item)) blocks[g].item = "COIN"; // check double upgradation, i.e. two "CARROTS" nearby luckily
                        
                        // fading out animation
                        blocks[g].node.firstChild.style.opacity = 1.0;
                        let reduceOpacityTimer = setInterval(reduceOpacityToItem, 25, g);
                        function reduceOpacityToItem(i){
                            let image = blocks[i].node.firstChild;
                            let currentOp = getComputedStyle(image).getPropertyValue("opacity");
                            if(currentOp <= 0){ console.log(i, "reduceOpacity");
                                image.style.opacity = 1.0;
                                blocks[i].updateImage(blocks[i].item);
                                clearInterval(reduceOpacityTimer);
                                return;
                            } 
                            currentOp = `${parseFloat(currentOp) - 0.1}`; // remember to convert string to number for calculation
                            image.style.opacity = currentOp;
                        }
                    }
                    // "RABBIT" -> "none"
                    else blocks[g].updateImage("none");
                }
            }
            // Can't combine
            else{
                // "RABBIT" -> "CARROT"
                for(let g of group){
                    blocks[g].item = "CARROT"; 
                    if(blocks[g].bfsForCombination(blocks[g].item)) blocks[g].item = "CARROTS"; // check upgradation

                    // fading out animation
                    blocks[g].node.firstChild.style.opacity = 1.0;
                    let reduceOpacityTimer = setInterval(reduceOpacityToItem, 25, g);
                    function reduceOpacityToItem(i){
                        let image = blocks[i].node.firstChild;
                        let currentOp = getComputedStyle(image).getPropertyValue("opacity");
                        if(currentOp <= 0){ console.log(i, "reduceOpacity");
                            image.style.opacity = 1.0;
                            blocks[i].updateImage(blocks[g].item);
                            localStorage.setItem(`blocks[${i}].item`, blocks[i].item); // need storing additionally since animation happens after setLocalStorage()
                            clearInterval(reduceOpacityTimer);
                            return;
                        } 
                        currentOp = `${parseFloat(currentOp) - 0.1}`; // remember to convert string to number for calculation
                        image.style.opacity = currentOp;
                    }
                }
            } 

            // Maintain rabbitOrder of those escaped rabbits
            for(let g of group) maintainOrder("RABBIT", g, -1);
        }

        // move to another block (old position: "RABBIT" -> "none")(new position: "none" -> "RABBIT")
        for(let i of needToMove){
            if(i == this.index) continue; // when a rabbit first appears, I don't want it to move
            let neighborhood = [i];
            for(let j = 0; j < 4; j++){
                let neighbor = i + Dir[j];
                if(neighbor < 0 || neighbor >= BlockNumber) continue;
                if((i % BlockColumnNumber == 0) && (neighbor % BlockColumnNumber == 5)) continue; // first column and last column are not neighbors
                if((i % BlockColumnNumber == 5) && (neighbor % BlockColumnNumber == 0)) continue; // first column and last column are not neighbors
                if(blocks[neighbor].item == "none") neighborhood.push(neighbor); 
            }
            neighborhood = FisherYatesShuffle(neighborhood);
            blocks[i].updateImage("none");
            blocks[neighborhood[0]].updateImage("RABBIT");
            console.log("rabbit moves from", i ,"to", neighborhood[0]);

            maintainOrder("RABBIT", i, neighborhood[0]);
        }
    }

    /* Upgrade */
    upgrade(){
        let newItemIndex = ItemToNumber[this.item] + 1;
        this.item = ItemName[newItemIndex]; // upgrade
        this.addPoints(this.item);
    }

    /* add points */    
    addPoints(item){ 
        points += Points[ItemToNumber[item]]; console.log(points, typeof points); 
        updatePoints();
    }
}

/* -------------------- ### Functions -------------------- */

/* -------------------- About Images -------------------- */

/* Load all images in advance */
function loadImage(){
    for(let k = 0; k < ItemName.length; k++){
        let item = ItemName[k]; // properties
        let imgArray = []; // keys

        /* For blocks */
        for(let i = 0; i < BlockRowNumber; i++){
            for(let j = 0; j < BlockColumnNumber; j++){
                let index = i * BlockRowNumber + j;
                let img = setPropertyOfImage(item, index);
                imgArray.push(img);
            }
        }

        /* For hold buttom */
        imgArray.push(setPropertyOfImage(item, BlockNumber)); // e.g. index: 36

        /* For current item image */
        imgArray.push(setPropertyOfImage(item, BlockNumber + 1)); // e.g. index: 37

        /* Store */
        imgs[item] = imgArray;
    }
}

/* Set the properties of an image */
function setPropertyOfImage(item, index){
    let img = document.createElement("img");
    img.setAttribute("class", "item");
    img.setAttribute("id", `${item}${index}`);
    img.setAttribute("src", `./image/${item}.png`);
    img.setAttribute("height", `${BlockSideLength - 10}px`);
    img.setAttribute("width", `${BlockSideLength - 10}px`);
    return img;
}

/* -------------------- About Containers -------------------- */

/* Set the size of game container */
function setSizeOfGameContainer(){
    gameContainer = document.getElementById("gameContainer");
    gameContainer.style.height = GameContainerHeight + "px";
    gameContainer.style.width = GameContainerWidth + "px";
}

/* Create the Block Container */
function createBlockContainer(){
    blockContainer = document.createElement("div");
    gameContainer.appendChild(blockContainer);
}

/* Set properties of the block container */
function setPropertyOfBlockContainer(){
    blockContainer.id = "blockContainer";
    // blockContainer.style.height = BlockContainerHeight + "px";
    // blockContainer.style.width = BlockContainerWidth + "px";
    // blockContainer.style.top = GameContainerHeight * 0.4 + "px";
    blockContainer.style.gridTemplateColumns = `repeat(${BlockColumnNumber}, 1fr)`;
    blockContainer.style.gridTemplateRows = `repeat(${BlockRowNumber}, 1fr)`;
}

/* Set properties of the option container */
function setPropertyOfOptionContainer(){
    optionContainer = document.getElementById("optionContainer");
    // optionContainer.style.height = OptionContainerHeight + "px";
    // optionContainer.style.width = OptionContainerWidth + "px";
    // optionContainer.style.top = GameContainerHeight * 0.2 + "px";
}

/* -------------------- About Hold Item -------------------- */

/* Update the image of the hold button */ 
function updateImageOfHoldItem(){
    if (holdImage.firstChild) holdImage.removeChild(holdImage.firstChild);
    if (holdItem != "none") holdImage.appendChild(imgs[holdItem][BlockNumber]);
}

/* Set the event of the hold button */
function setEventOfHoldButton(){
    holdButton.addEventListener("click", function(e){
        e = e || window.event;
        if(holdItem == "none"){
            // Setting hold item
            holdItem = itemPool[currImgIndex];
            updateImageOfHoldItem();
    
            // Setting current item
            currImgIndex++;
            updateImageOfCurrItem();
        }
        else{
            // Setting hold item
            let temp = holdItem;
            holdItem = itemPool[currImgIndex];
            updateImageOfHoldItem();
    
            // Setting current item
            itemPool[currImgIndex] = temp;
            updateImageOfCurrItem();
        }
        setLocalStorage(); // store game information to the window.localstorage
    });
}

/* -------------------- About current Item -------------------- */

/* Fill the item pool with 100 images based on the possibility of each item */
function fillItemPool(){
    for(let i = 0; i < ItemName.length; i++){
        for(let j = 0; j < Possibility[i]; j++){
            itemPool.push(ItemName[i]);
        }
    }
}

/* Reset the itemPool*/
function resetItemPool(){
    currImgIndex = 0;
    itemPool = FisherYatesShuffle(itemPool); console.log(itemPool);
}
    
/* Update the image of the current item */ 
function updateImageOfCurrItem(){ 
    if(currImage.firstChild) currImage.removeChild(currImage.firstChild);
    currImage.appendChild(imgs[itemPool[currImgIndex]][BlockNumber + 1]);
}

/* -------------------- About Blocks -------------------- */

/* Create blocks */
function createBlocks(){
    for(let i = 0; i < BlockRowNumber; i++){
        for(let j = 0; j < BlockColumnNumber; j++){
            let block = new Block(i * BlockRowNumber + j);
            blockContainer.appendChild(block.node);
            blocks.push(block);
        }
    }
}

/* Initialize some blocks to some images when starting a new game */
function initializeBlocks(){
    let obj = ["GRASS", "GRASS", "BUSH", "BUSH", "TREE", "HOUSE"];
    let visited = [];
    for(let i = 0; i < BlockNumber; i++) visited[i] = false;
    for(let o of obj){
        let idx = Math.floor(Math.random() * BlockNumber); // 0 <= idx < blockNumber
        while(visited[idx]) idx = Math.floor(Math.random() * (BlockNumber + 1));
        visited[idx] = true;
        blocks[idx].updateImage(o);
    }
}

/* Set the event of blocks */
function setEventOfBlocks(){
    for(let block of blocks){
        console.log(block);
        block.node.addEventListener("click", function(e){
            e = e || window.event;
            block.changeTypeByClick(e.clientX);
        });
    }
}

/* -------------------- About Rabbits -------------------- */

/* Maintain the appearance order of rabbits and G8rabbits */
function maintainOrder(item, oldIdx, newIdx){ 
    if(item == "RABBIT"){
        let pos = rabbitOrder.indexOf(oldIdx);
        if(newIdx == -1) rabbitOrder.splice(pos, 1);
        else if(newIdx != -1) rabbitOrder[pos] = newIdx;
    }
    else if(item == "G8RABBIT"){
        let pos = G8rabbitOrder.indexOf(oldIdx);
        if(newIdx == -1) G8rabbitOrder.splice(pos, 1);
        else if(newIdx != -1) G8rabbitOrder[pos] = newIdx;
    }
}

/* -------------------- About Points -------------------- */
function updatePoints(){
    pointDiv.innerText = `${points}`;
}

/* -------------------- About New Game -------------------- */
function setEventOfNewGameButton(){
    newGameButton.addEventListener("click", function(e){
        e = e || window.event;
        resetItemPool();
        holdItem = "none";
        updateImageOfHoldItem();
        updateImageOfCurrItem();
        for(let block of blocks) block.resetBlock();
        initializeBlocks();
        points = 0;
        updatePoints();
        localStorage.clear();
        setLocalStorage();
    });
}

/* -------------------- About LocalStorage -------------------- */

/* Keep in mind that it will store as "string" in the localStorage */
function setLocalStorage(){
    localStorage.setItem("holdItem", holdItem);
    localStorage.setItem("itemPool", JSON.stringify(itemPool)); // use JSON.stringify() to store array as a JSON string
    localStorage.setItem("currImgIndex", currImgIndex);
    localStorage.setItem("points", points); 
    for(let i = 0; i < BlockNumber; i++){
        localStorage.setItem(`blocks[${i}].item`, blocks[i].item);
    } 
}

function recoverFromLocalStorage(){
    if(localStorage.getItem("holdItem")){
        holdItem = localStorage.getItem("holdItem");
        updateImageOfHoldItem();
    } 
    if(localStorage.getItem("itemPool")){
        itemPool = JSON.parse(localStorage.getItem("itemPool")); // recover JSON string to an array by JSON.parse()
    } 
    if(localStorage.getItem("currImgIndex")){
        currImgIndex = parseInt(localStorage.getItem("currImgIndex")); 
        updateImageOfCurrItem();
    } 
    if(localStorage.getItem("points")){
        points = parseInt(localStorage.getItem("points")); // without parseInt(), it will be seen as a string in the follow-up additions
        updatePoints();
    } 
    for(let i = 0; i < BlockNumber; i++){
        if(localStorage.getItem(`blocks[${i}].item`)){
            blocks[i].item = localStorage.getItem(`blocks[${i}].item`);
            blocks[i].updateImage(blocks[i].item);
        }
    } 
}

/* -------------------- Others -------------------- */

/* Used to shuffle an array in the time complexity O(n) */
function FisherYatesShuffle(arr){
    for(let i = arr.length - 1; i > 0; i--){
        let j = Math.floor(Math.random() * (i + 1)); // 0 <= j <= i
        let temp = arr[i]; // swap arr[i] and arr[j]
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}

/* -------------------- ### Declaration -------------------- */
let imgs = {};
let currImgIndex;
let itemPool = [];

let gameContainer;
let blockContainer;
let optionContainer;

let holdItem, holdImage, holdButton;
let currImage;
let pointDiv, points;
let newGameButton;

let blocks = [];
let G8rabbitOrder = [];
let rabbitOrder = [];

/* -------------------- ### Initialization -------------------- */ 

/* Images */
loadImage();

/* Game Container */
setSizeOfGameContainer();

/* Block Container */
createBlockContainer();
setPropertyOfBlockContainer();
setPropertyOfOptionContainer();

// console.log(gameContainer.getBoundingClientRect());
// console.log(optionContainer.getBoundingClientRect());
// console.log(blockContainer.getBoundingClientRect());

/* Hold Button */
holdItem = "none";
holdImage = document.getElementById("holdImage");
holdButton = document.getElementById("holdButton");
setEventOfHoldButton();

/* Current Item Button */
fillItemPool(); console.log(itemPool);
resetItemPool();
// currItemButton = document.getElementById("currItemButton");
currImage = document.getElementById("currImage");
updateImageOfCurrItem();

/* Points */
points = parseInt(0); 
pointDiv = document.getElementById("points"); 
updatePoints();

/* New Game Button */
newGameButton = document.getElementById("newGameButton");
setEventOfNewGameButton();

/* Blocks */
createBlocks();
setEventOfBlocks();
initializeBlocks();

/* Recover formor playing progress from Localstorage */
recoverFromLocalStorage();