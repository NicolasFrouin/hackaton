const DEBUG_MODE = true;
const Hackaton = {
	poses: null,
	pose: null,
	keypoints: null,
	runner: null,
	state: {
		hasGameStarted: false,
		hasTPosed: false,
		internalCounter: 0,
		isGameRunning: false,
		shoulderRefPoint: { x: null, y: null },
		jumpThreshold: null,
		crouchThreshold: null,
		lastAction: null,
	},
	actions: [
		{ key: "jump", test: "isJumping", exec: "jump", stop: "stopJump" },
		{ key: "crouch", test: "isCrouching", exec: "crouch", stop: "stopCrouch" },
		// { key: "right", test: "isRighting", exec: "right", stop: "stopRight" },
		// { key: "left", test: "isLefting", exec: "left", stop: "stopLeft" },
	],
	conf: {
		minScore: 0.35,
		tPoseYOffset: 100,
		tPoseThreshold: 15,
		jumpThreshold: 50,
		crouchThreshold: 50,
	},
	runApp(poses) {
		this.runner = window["RunnerApp"];
		if (poses.length > 1) return;
		if (!poses?.[0]?.keypoints) return;
		this.poses = poses;
		this.pose = poses[0];
		this.keypoints = poses[0].keypoints;
		if (!this.state.hasGameStarted) return this.startGame();
		if (!this.state.isGameRunning) return;
		if (this.runner.crashed) {
			this.state.hasGameStarted = false;
			this.state.isGameRunning = false;
			return debug("DEBUG : Game Over");
		}
		this.doActions();
	},
	startGame() {
		return this.init();
		if (this.state.internalCounter > this.conf.tPoseThreshold) {
			this.state.internalCounter = 0;
			this.init();
			return true;
		}
		if (this.isTPosing()) this.state.internalCounter++;
		else this.state.internalCounter = 0;
		return false;
	},
	init() {
		let shoulderRef = this.setShoulderRef();
		this.setStateThreshold("jumpThreshold", shoulderRef, "y", "below");
		this.setStateThreshold("crouchThreshold", shoulderRef, "y", "above");
		this.state.hasGameStarted = true;
		this.state.isGameRunning = true;
		debug("___ GAME STARTED ___");
		this.runner.playIntro();
		this.jump(); // update the t-rex
		return true;
	},
	getShoulderRef() {
		const [, , , , , l_shoulder, r_shoulder] = this.keypoints;
		return { x: Math.floor((l_shoulder.x + r_shoulder.x) / 2), y: Math.floor((l_shoulder.y + r_shoulder.y) / 2) };
	},
	setShoulderRef() {
		this.state.shoulderRefPoint = this.getShoulderRef();
		return this.state.shoulderRefPoint;
	},
	/**
	 * Sets a state's threshold from a reference point
	 *
	 * /!\ y axis is inverted : a point above an other will have a lower value
	 * @param {string} threshold Name of the state's threshold
	 * @param {object} refPoint The reference point
	 * @param {char} axis 'x' | 'y'
	 * @param {string} okState 'above' | 'below'
	 * @returns The updated state's threshold
	 */
	setStateThreshold(threshold, refPoint, axis, okState) {
		let thresholdValue =
			okState === "above" ? refPoint[axis] + this.conf[threshold] : refPoint[axis] - this.conf[threshold];
		this.state[threshold] = { axis, okState, value: thresholdValue };
		return this.state[threshold];
	},
	doActions() {
		let actionCancelState = 0;
		for (const action of this.actions) {
			if (this[action.test]()) {
				debug("DEBUG : action :", action.key, "fired");
				actionCancelState++;
				if (action.key !== this.state.lastAction?.key) {
					debug("diff");
					if (this.state.lastAction) {
						this[this.state.lastAction.stop]();
						this.state.lastAction.cancelled = true;
					}
				}
				this[action.exec]();
				this.state.lastAction = { ...action, cancelled: false };
				break;
			}
		}
		if (this.state.lastAction) {
			if (actionCancelState == 0 && this.state.lastAction?.stop && this.state.lastAction.cancelled === false) {
				this[this.state.lastAction.stop]();
				this.state.lastAction.cancelled = true;
			}
		}
	},
	isJumping() {
		return this.getShoulderRef()[this.state.jumpThreshold.axis] < this.state.jumpThreshold.value;
	},
	isCrouching() {
		return this.getShoulderRef()[this.state.crouchThreshold.axis] > this.state.crouchThreshold.value;
	},
	jump() {
		let jumpKeyCode = Object.keys(this.runner.keycodes.JUMP)[0];
		document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: jumpKeyCode }));
	},
	stopJump() {
		let jumpKeyCode = Object.keys(this.runner.keycodes.JUMP)[0];
		document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: jumpKeyCode }));
		debug("DEBUG : stop JUMP");
	},
	crouch() {
		let jumpKeyCode = Object.keys(this.runner.keycodes.DUCK)[0];
		document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: jumpKeyCode }));
	},
	stopCrouch() {
		let jumpKeyCode = Object.keys(this.runner.keycodes.DUCK)[0];
		document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: jumpKeyCode }));
		debug("DEBUG : stop CROUCH");
	},
	logPoses() {
		console.log("_______________");
		for (const pose of this.poses) {
			for (const kp of pose.keypoints) {
				if (kp.score > this.conf.minScore) {
					console.log(kp.name + " ->", "x :", Math.floor(kp.x), "y :", Math.floor(kp.y));
				}
			}
		}
		console.log("---------------");
	},
	isTPosing() {
		const [nose, , , , , l_shoulder, r_shoulder, l_elbow, r_elbow, l_wrist, r_wrist] = this.keypoints;
		const bothArms = [r_shoulder, r_elbow, r_wrist, l_shoulder, l_elbow, l_wrist];
		if (bothArms.some((kp) => !this.isAboveMinScore(kp))) return false;
		if (bothArms.some((kp) => kp.y < nose.y)) return false;
		if (l_shoulder.x > l_elbow.x || l_elbow.x > l_wrist.x) return false;
		if (r_shoulder.x < r_elbow.x || r_elbow.x < r_wrist.x) return false;
		if (!this.isArmFlat(r_shoulder, r_elbow, r_wrist) || !this.isArmFlat(l_shoulder, l_elbow, l_wrist))
			return false;
		this.state.hasTPosed = true;
		return true;
	},
	isAboveMinScore(keypoint) {
		return keypoint.score > this.conf.minScore;
	},
	isArmFlat(shoulder, elbow, wrist) {
		let { y: s } = shoulder;
		let { y: e } = elbow;
		let { y: w } = wrist;
		let yOff = this.conf.tPoseYOffset;
		return this.between(s, e - yOff, e + yOff) && this.between(e, w - yOff, w + yOff);
	},
	between(value, min, max, strict = false) {
		return strict ? min < value && value < max : min <= value && value <= max;
	},
};

const debug = (...args) => DEBUG_MODE && console.log(...args);
