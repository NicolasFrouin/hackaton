console.log("App running");

const Hackaton = {
	poses: null,
	pose: null,
	state: {
		hasGameStarted: false,
		hasTPosed: false,
	},
	conf: {
		minScore: 0.35,
		tPoseYOffset: 100,
	},
	runApp(poses) {
		if (poses.length > 1) return;
		this.poses = poses;
		this.pose = poses[0];
		this.isTPosing(poses);
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
		if (!pose.keypoints) return false;
		const [nose, , , , , l_shoulder, r_shoulder, l_elbow, r_elbow, l_wrist, r_wrist] = pose.keypoints;
		const bothArms = [r_shoulder, r_elbow, r_wrist, l_shoulder, l_elbow, l_wrist];
		if (bothArms.some((kp) => !this.isAboveMinScore(kp))) return false;
		if (bothArms.some((kp) => kp.y < nose.y)) return false;
		if (l_shoulder.x > l_elbow.x || l_elbow.x > l_wrist.x) return false;
		if (r_shoulder.x < r_elbow.x || r_elbow.x < r_wrist.x) return false;
		if (!this.isArmFlat(r_shoulder, r_elbow, r_wrist) || !this.isArmFlat(l_shoulder, l_elbow, l_wrist))
			return false;
		console.log("T");
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

const mock = [
	{
		keypoints: [
			{
				y: 346.4172685045652,
				x: 606.3789437274926,
				score: 0.7547693848609924,
				name: "nose",
			},
			{
				y: 314.7816174809081,
				x: 640.7472467425196,
				score: 0.6398158669471741,
				name: "left_eye",
			},
			{
				y: 318.025121665049,
				x: 577.3207058881414,
				score: 0.7796675562858582,
				name: "right_eye",
			},
			{
				y: 329.34953816754654,
				x: 692.4856387464677,
				score: 0.5414053797721863,
				name: "left_ear",
			},
			{
				y: 335.6528737508478,
				x: 551.9067460365682,
				score: 0.5698563456535339,
				name: "right_ear",
			},
			{
				y: 444.04272677492384,
				x: 789.8489798901917,
				score: 0.7550020813941956,
				name: "left_shoulder",
			},
			{
				y: 426.0885481231481,
				x: 484.51607429636476,
				score: 0.6698603630065918,
				name: "right_shoulder",
			},
			{
				y: 446.16643040386964,
				x: 982.5785974910841,
				score: 0.7086151242256165,
				name: "left_elbow",
			},
			{
				y: 437.53656030055623,
				x: 304.20555952348815,
				score: 0.7144396305084229,
				name: "right_elbow",
			},
			{
				y: 436.05452134439895,
				x: 1205.828035141831,
				score: 0.448592871427536,
				name: "left_wrist",
			},
			{
				y: 416.6485518583976,
				x: 105.54834185050531,
				score: 0.6267268657684326,
				name: "right_wrist",
			},
			{
				y: 748.4734800003864,
				x: 736.7329314067132,
				score: 0.587343692779541,
				name: "left_hip",
			},
			{
				y: 752.9216078674978,
				x: 531.4392415989228,
				score: 0.628291130065918,
				name: "right_hip",
			},
			{
				y: 686.4601963930171,
				x: 788.8826632454029,
				score: 0.11447647213935852,
				name: "left_knee",
			},
			{
				y: 694.5410483572409,
				x: 510.1213591414145,
				score: 0.10901930928230286,
				name: "right_knee",
			},
			{
				y: 536.7385754718341,
				x: 853.9509133511991,
				score: 0.0153295723721385,
				name: "left_ankle",
			},
			{
				y: 430.6864829979332,
				x: 94.06756889194915,
				score: 0.033761534839868546,
				name: "right_ankle",
			},
		],
		score: 0.6480297148227692,
	},
];
