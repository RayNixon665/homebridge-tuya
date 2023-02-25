
const BaseAccessory = require('./BaseAccessory');

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

        //const {Service, Characteristic} = this.hap;
	const {Service, Characteristic, AdaptiveLightingController} = this.hap;
        const serviceFan = this.accessory.getService(Service.Fan);
        const serviceLightbulb = this.accessory.getService(Service.Lightbulb);
        this._checkServiceName(serviceFan, this.device.context.name);
        this._checkServiceName(serviceLightbulb, this.device.context.name + " Light");
	    
        this.dpActive = this._getCustomDP(this.device.context.dpActive) || '1';
        this.dpRotationSpeed = this._getCustomDP(this.device.context.RotationSpeed) || '3';
        this.dpLightOn = this._getCustomDP(this.device.context.dpLightOn) || '9';
	this.dpColorTemperature = this._getCustomDP(this.device.context.dpColorTemperature) || '3';
        this.dpBrightness = this._getCustomDP(this.device.context.dpBrightness) || '10';
        this.useLight = this._coerceBoolean(this.device.context.useLight, true);
        this.useBrightness = this._coerceBoolean(this.device.context.useBrightness, true);
        this.maxSpeed = parseInt(this.device.context.maxSpeed) || 4;

        const characteristicActive = serviceFan.getCharacteristic(Characteristic.On)
            .updateValue(this._getActive(dps[this.dpActive]))
            .on('get', this.getActive.bind(this))
            .on('set', this.setActive.bind(this));

        const characteristicRotationSpeed = serviceFan.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({
                minValue: 0,
                maxValue: this.maxSpeed,
                minStep: 1})
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
       	    	characteristicBrightness = service.getCharacteristic(Characteristic.Brightness)
           	.updateValue(this.convertBrightnessFromTuyaToHomeKit(dps[this.dpBrightness]))
            	.on('get', this.getBrightness.bind(this))
            	.on('set', this.setBrightness.bind(this));
            }
		
	  
		characteristicColorTemperature = service.getCharacteristic(Characteristic.ColorTemperature)
                .setProps({
                minValue: 0,
                maxValue: 600
            	})
            .updateValue(this.convertColorTemperatureFromTuyaToHomeKit(dps[this.dpColorTemperature]))
            .on('get', this.getColorTemperature.bind(this))
            .on('set', this.setColorTemperature.bind(this));

        	this.characteristicColorTemperature = characteristicColorTemperature;
			
	if (this.adaptiveLightingSupport()) {
            this.adaptiveLightingController = new AdaptiveLightingController(service);
            this.accessory.configureController(this.adaptiveLightingController);
            this.accessory.adaptiveLightingController = this.adaptiveLightingController;
        }
		    
		this.device.on('change', (changes, state) => {
            if (changes.hasOwnProperty(this.dpLightOn) && characteristicOn.value !== changes[this.dpLightOn]) characteristicOn.updateValue(changes[this.dpLightOn]);

            if (changes.hasOwnProperty(this.dpBrightness) && this.convertBrightnessFromHomeKitToTuya(characteristicBrightness.value) !== changes[this.dpBrightness])
                characteristicBrightness.updateValue(this.convertBrightnessFromTuyaToHomeKit(changes[this.dpBrightness]));

            if (changes.hasOwnProperty(this.dpColorTemperature)) {
                if (this.convertColorTemperatureFromHomeKitToTuya(characteristicColorTemperature.value) !== changes[this.dpColorTemperature])
                    characteristicColorTemperature.updateValue(this.convertColorTemperatureFromTuyaToHomeKit(changes[this.dpColorTemperature]));
            } else if (changes[this.dpBrightness]) {
                characteristicColorTemperature.updateValue(this.convertColorTemperatureFromTuyaToHomeKit(state[this.dpColorTemperature]));
            }
        });
		    
		    
		    
        }

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

//		console.log("_getSpeed = " + dp);

        return dp;

    }




    setSpeed(value, callback) {

        const {Characteristic} = this.hap;

        if (value == 0) {

        	return this.setState(this.dpActive, false, callback);

        } else {

        	return this.setState(this.dpRotationSpeed, value.toString(), callback);
        }




        callback();

    }

    

/*************************** LIGHT ***************************/

// Lightbulb State

    getBrightness(callback) {
        return callback(null, this.convertBrightnessFromTuyaToHomeKit(this.device.state[this.dpBrightness]));
    }

    setBrightness(value, callback) {
        return this.setState(this.dpBrightness, this.convertBrightnessFromHomeKitToTuya(value), callback);
    }

    getColorTemperature(callback) {
        callback(null, this.convertColorTemperatureFromTuyaToHomeKit(this.device.state[this.dpColorTemperature]));
    }

    setColorTemperature(value, callback) {
        if (value === 0) return callback(null, true);

        this.setState(this.dpColorTemperature, this.convertColorTemperatureFromHomeKitToTuya(value), callback);
    }

}




module.exports = SimpleFanLightAccessory2;
