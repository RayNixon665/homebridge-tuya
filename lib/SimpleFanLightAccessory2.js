const BaseAccessory = require('./BaseAccessory');
const async = require('async');

class SimpleFanLightAccessory2 extends BaseAccessory {

    static getCategory(Categories) {
        return Categories.FANLIGHT;
    }

    constructor(...props) {
        super(...props);
    }

    _registerPlatformAccessory() {
        const {Service} = this.hap;
        this.accessory.addService(Service.Fan, this.device.context.name);
        this.accessory.addService(Service.Lightbulb, this.device.context.name + " Light");
        super._registerPlatformAccessory();
    }

    _registerCharacteristics(dps) {
       // const {Service, Characteristic} = this.hap;
	const {Service, Characteristic, AdaptiveLightingController} = this.hap;
	const serviceLightbulb = this.accessory.getService(Service.Lightbulb);
	    
        const serviceFan = this.accessory.getService(Service.Fan);
        this._checkServiceName(serviceFan, this.device.context.name);
        this._checkServiceName(serviceLightbulb, this.device.context.name + " Light");
	    
        this.dpActive = this._getCustomDP(this.device.context.dpActive) || '1';
        this.dpRotationSpeed = this._getCustomDP(this.device.context.RotationSpeed) || '3';
	//this.dpRotationDirection = this._getCustomDP(this.device.context.RotationDirection) || '5';
	    
	this.dpLightOn = this._getCustomDP(this.device.context.dpLightOn) || '9';
	this.dpColorTemperature = this._getCustomDP(this.device.context.dpColorTemperature) || '11';    
        this.dpBrightness = this._getCustomDP(this.device.context.dpBrightness) || '10';
	
	this.useLight = this._coerceBoolean(this.device.context.useLight, true);
	this.useBrightness = this._coerceBoolean(this.device.context.useBrightness, true);  
	this.useTemp = this._coerceBoolean(this.device.context.useTemp, true); 

        this.maxSpeed = parseInt(this.device.context.maxSpeed) || 4;

        const characteristicActive = serviceFan.getCharacteristic(Characteristic.On)
            .updateValue(this._getActive(dps[this.dpActive]))
            .on('get', this.getActive.bind(this))
            .on('set', this.setActive.bind(this));
	    
	//    const characteristicRotationDirection = serviceFan.getCharacteristic(Characteristic.RotationDirection)
	 //   .updateValue(dps[this.dpRotationDirection])
          //  .on('get', this.getState.bind(this, this.dpRotationDirection))
           // .on('set', this.setState.bind(this, this.dpRotationDirection));

        const characteristicRotationSpeed = serviceFan.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({
                minValue: 0,
                maxValue: 6,
                minStep: 1
            })
            .updateValue(this._getSpeed(dps[this.dpRotationSpeed]))
            .on('get', this.getSpeed.bind(this))
            .on('set', this.setSpeed.bind(this));

        let characterLightOn;
        let characteristicBrightness;
	let characteristicColorTemperature;
      
	if (this.useLight) {
            characterLightOn = serviceLightbulb.getCharacteristic(Characteristic.On)
            .updateValue(dps[this.dpLightOn])
            .on('get', this.getState.bind(this, this.dpLightOn))
            .on('set', this.setState.bind(this, this.dpLightOn));

		    if (this.useBrightness) {
		    characteristicBrightness = serviceLightbulb.getCharacteristic(Characteristic.Brightness)
			.updateValue(this.convertBrightnessFromTuyaToHomeKit(dps[this.dpBrightness]))
			.on('get', this.getBrightness.bind(this))
			.on('set', this.setBrightness.bind(this));
		    }
		    if (this.useTemp) {
		    characteristicColorTemperature = serviceLightbulb.getCharacteristic(Characteristic.ColorTemperature)
            		.setProps({
            		minValue: 0,
                	maxValue: 600
            })
            .updateValue(this.convertColorTemperatureFromTuyaToHomeKit(dps[this.dpColorTemperature]))
            .on('get', this.getColorTemperature.bind(this))
            .on('set', this.setColorTemperature.bind(this));
		    
		    this.characteristicColorTemperature = characteristicColorTemperature;

			if (this.adaptiveLightingSupport()) {
			   this.adaptiveLightingController = new AdaptiveLightingController(serviceLightbulb);
			   this.accessory.configureController(this.adaptiveLightingController);
			   this.accessory.adaptiveLightingController = this.adaptiveLightingController;
			}
		    }
	}


        this.device.on('change', (changes, state) => {

            if (changes.hasOwnProperty(this.dpActive) && characteristicActive.value !== changes[this.dpActive])
                characteristicActive.updateValue(changes[this.dpActive]);
		
	  //  if (changes.hasOwnProperty(this.dpRotationDirection) && characteristicRotationDirection.value !== changes[this.dpRotationDirection])
           //     characteristicRotationDirection.updateValue(changes[this.dpRotationDirection]);

            if (changes.hasOwnProperty(this.dpRotationSpeed) && characteristicRotationSpeed.value !== changes[this.dpRotationSpeed])
                characteristicRotationSpeed.updateValue(changes[this.dpRotationSpeed]);

	    if (changes.hasOwnProperty(this.dpLightOn) && characterLightOn && characterLightOn.value !== changes[this.dpLightOn])
                characterLightOn.updateValue(changes[this.dpLightOn]);
		
            if (changes.hasOwnProperty(this.dpBrightness) && this.convertBrightnessFromHomeKitToTuya(characteristicBrightness.value) !== changes[this.dpBrightness])
                characteristicBrightness.updateValue(this.convertBrightnessFromTuyaToHomeKit(changes[this.dpBrightness]));

 	    if (changes.hasOwnProperty(this.dpColorTemperature)) {
                if (this.convertColorTemperatureFromHomeKitToTuya(characteristicColorTemperature.value) !== changes[this.dpColorTemperature])
                    characteristicColorTemperature.updateValue(this.convertColorTemperatureFromTuyaToHomeKit(changes[this.dpColorTemperature]));
		    console.log("Set Characteristic Color - " + this.convertColorTemperatureFromTuyaToHomeKit(changes[this.dpColorTemperature]));
		    console.log("Set Characteristic Color (Inverted) - " + this.scale(this.convertColorTemperatureFromTuyaToHomeKit(changes[this.dpColorTemperature])));
            } else if (changes[this.dpBrightness]) {
                characteristicColorTemperature.updateValue(this.convertColorTemperatureFromTuyaToHomeKit(state[this.dpColorTemperature]));
            }

            console.log('[Tuya] SimpleFanLight changed: ' + JSON.stringify(state));

        });

    }




/*************************** FAN ***************************/

// Fan State

    getActive(callback) {
        this.getState(this.dpActive, (err, dp) => {
            if (err) return callback(err);
            callback(null, this._getActive(dp));
        });
    }

    _getActive(dp) {
        const {Characteristic} = this.hap;
        return dp;
    }

    setActive(value, callback) {
        const {Characteristic} = this.hap;
        return this.setState(this.dpActive, value, callback);
        callback();
    }

// Fan Speed

    getSpeed(callback) {
        this.getState(this.dpRotationSpeed, (err, dp) => {
            if (err) return callback(err);
            callback(null, this._getSpeed(dp));
        });
    }

    _getSpeed(dp) {
        const {Characteristic} = this.hap;
        return dp;
    }

    setSpeed(value, callback) {
        const {Characteristic} = this.hap;
        if (value == 0) {
        	return this.setState(this.dpActive, false, callback);
        } else {
        	return this.setState(this.dpRotationSpeed, value.toString(), callback);
       console.log("Change Speed Request" + this.dpRotationSpeed + " - " + value);
        }
        callback();
    }

    
/*************************** LIGHT ***************************/
    
// Lightbulb Brightness

    getBrightness(callback) {
        return callback(null, this.convertBrightnessFromTuyaToHomeKit(this.device.state[this.dpBrightness]));
    }

    setBrightness(value, callback) {
        return this.setState(this.dpBrightness, this.convertBrightnessFromHomeKitToTuya(value), callback);
    }

    getColorTemperature(callback) {
        callback(null, this.invNumb(this.convertColorTemperatureFromTuyaToHomeKit(this.device.state[this.dpColorTemperature])));
	    console.log("Get Colour State - " + this.invNumb(this.convertColorTemperatureFromTuyaToHomeKit(this.device.state[this.dpColorTemperature])));
    }

    setColorTemperature(value, callback) {
        if (value === 0) return callback(null, true);

        this.setState(this.dpColorTemperature, this.invNumb(this.convertColorTemperatureFromHomeKitToTuya(value)), callback);
	    console.log("Set Colour State - " + this.invNumb(this.convertColorTemperatureFromHomeKitToTuya(value)));

    }
	invNumb(input){
	let result = input - 100;
	return result * -1;	
	}
	
	scale (input) {
		let inMin = 71;
		let inMax = 350;
		let outMin = 350;
		let outMax = 71;
	    return (input - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
	}
	
	
	
	

}




module.exports = SimpleFanLightAccessory2;
