console.log("App running");

const Hackaton = {
	poses: null,
	pose: null,
	state: {
		hasGameStarted: false,
		hasTPosed: false,
		crouchLimit: null,
		leanLeftLimit: null,
		leanRightLimit: null,
		leanSide: "middle",
	},
	conf: {
		minScore: 0.35,
		tPoseYOffset: 100,
		crouchThreshHold: 1.4,
		leanThreshHoldLeft: 1.4,
		leanThreshHoldRight: 0.6,
	},
	runApp(poses) {
		if (poses.length > 1) return;
		this.poses = poses;
		this.pose = poses[0];
		console.log(this.isTPosing(poses), !this.state.hasTPosed);
		if (this.isTPosing(poses) && this.state.hasTPosed == false) {
			console.log("---------------SET UP-----------------");
			const pose = this.pose;
			const [nose, , , , , l_shoulder, r_shoulder, , , ,] = pose.keypoints;
			console.log(l_shoulder.y, r_shoulder.y, this.conf.crouchThreshHold);
			this.state.crouchLimit = ((l_shoulder.y + r_shoulder.y) / 2) * this.conf.crouchThreshHold;
			this.state.leanLeftLimit = nose.x * this.conf.leanThreshHoldLeft;
			this.state.leanRightLimit = nose.x * this.conf.leanThreshHoldRight;

			this.state.hasTPosed = true;
		} else if (this.state.hasTPosed) {
			console.log(this.isCrouching(poses));
			if (this.isLeaningLeft(poses) == false && this.isLeaningRight(poses) == false) {
				this.state.leanSide = "middle";
			}
			console.log("Lean : ", this.state.leanSide);
		}
	},
	logPoses() {
		console.log("_______________");
		for (const pose of this.poses) {
			for (const kp of pose.keypoints) {
				if (kp.score > 0.35) {
					console.log(kp.name + " ->", "x :", Math.floor(kp.x), "y :", Math.floor(kp.y));
				}
			}
		}
		console.log("---------------");
	},
	isTPosing() {
		const pose = this.pose;
		if (!pose?.keypoints) return false;
		const [nose, , , , , l_shoulder, r_shoulder, l_elbow, r_elbow, l_wrist, r_wrist] = pose.keypoints;
		const bothArms = [r_shoulder, r_elbow, r_wrist, l_shoulder, l_elbow, l_wrist];
		if (bothArms.some((kp) => !this.isAboveMinScore(kp))) return false;
		if (bothArms.some((kp) => kp.y < nose.y)) return false;
		if (l_shoulder.x > l_elbow.x || l_elbow.x > l_wrist.x) return false;
		if (r_shoulder.x < r_elbow.x || r_elbow.x < r_wrist.x) return false;
		if (!this.isArmFlat(r_shoulder, r_elbow, r_wrist) || !this.isArmFlat(l_shoulder, l_elbow, l_wrist))
			return false;
		console.log("T");
		return true;
	},
	isCrouching() {
		const pose = this.pose;
		if (!pose?.keypoints) return false;
		const [, , , , , l_shoulder, r_shoulder, , , ,] = pose.keypoints;
		var avgShoulderY = (l_shoulder.y + r_shoulder.y) / 2;
		if (avgShoulderY < this.state.crouchLimit) return false;
		console.log("Crouched");
		return true;
	},
	isLeaningLeft() {
		const pose = this.pose;
		if (!pose?.keypoints) return false;
		const [nose, , , , , , , , , ,] = pose.keypoints;
		if (nose.x < this.state.leanLeftLimit) return false;
		this.state.leanSide = "left";
		return true;
	},
	isLeaningRight() {
		const pose = this.pose;
		if (!pose?.keypoints) return false;
		const [nose, , , , , , , , , ,] = pose.keypoints;
		if (nose.x > this.state.leanRightLimit) return false;
		this.state.leanSide = "right";
		return true;
	},
	isAboveMinScore(keypoint) {
		return keypoint.score > this.conf.minScore;
	},
	isBelowMinScore(keypoint) {
		return keypoint.score < this.conf.minScore;
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
