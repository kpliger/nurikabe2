

class BlanketLoader {
	initialize(){
		if(document.querySelectorAll('#loadingBlanket').length>0) return;

		document.querySelector('body').innerHTML +=`
			<style>
				#loadingBlanket h1:empty::after{
					content:'Loading...'
				}
			</style>
			<div id='loadingBlanket'
				style='position: fixed;
					width: 100%;
					height: 100%;
					top: 0;
					left: 0;
					background-color: #0002;
					z-index: 1;
					display: none;'
			>
				<h1 style='position: absolute;
					top: 50%;
					left: 50%;
					transform: translate(-50%,-50%);
					color:black;
					text-shadow: 0 0 4px white;'></h1>
			</div>
		`;
		this.moveToTop();

	}
	show(){
		document.querySelector('#loadingBlanket').style['display'] = 'block';
		document.querySelector('html').style['overflow'] = 'hidden';
	}
	hide(){
		document.querySelector('#loadingBlanket').style['display'] = 'none';
		document.querySelector('html').style['overflow'] = 'auto';
	}
	moveToTop(){
		let highestZIndex = 0;
		const elementSiblings = this.getSiblings(document.querySelector("#loadingBlanket"));
		elementSiblings.forEach(element => {
			let zIndex = element.style['z-index'];
			zIndex = parseInt(zIndex);
			if (!Number.isInteger(zIndex)) return;
			if (highestZIndex < zIndex) highestZIndex = zIndex;

		});


		if (document.querySelector("#loadingBlanket").style['z-index'] < highestZIndex) {
			document.querySelector("#loadingBlanket").style['z-index'] = highestZIndex + 1;
		}
	}
	getSiblings(e) {
		// for collecting siblings
		let siblings = [];
		// if no parent, return no sibling
		if(!e.parentNode) {
			return siblings;
		}
		// first child of the parent node
		let sibling  = e.parentNode.firstChild;
		// collecting siblings
		while (sibling) {
			if (sibling.nodeType === 1 && sibling !== e) {
				siblings.push(sibling);
			}
			sibling = sibling.nextSibling;
		}
		return siblings;
	}
}

export default BlanketLoader;