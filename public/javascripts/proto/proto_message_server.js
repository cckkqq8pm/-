"use strict";
/** @suppress {duplicate}*/var Chat;
if (typeof(Chat)=="undefined") {Chat = {};}

Chat.ChatMessageType= PROTO.Enum("Chat.ChatMessageType",{
		LINK_RABBITMQ :1,
		LOGINREQUEST :2,
		CHATREQUEST :3,
		CHATRESPONSE :4,
		SINGLEROOMENTER :5,
		SINGLEROOMRESPONSE :6,
		PREPAREDREADY :7,
		READRESPONSE :8,
		BACKTOMAINHALL :9,
		BACKHALLRESPONSE :10,
		SENDPLAYMAP :11,
		PLAYWIN :12,
		LOGOUT :13});
Chat.Color= PROTO.Enum("Chat.Color",{
		RED :1,
		BLACK :2,
		NULL :3});
Chat.ChatMessage = PROTO.Message("Chat.ChatMessage",{
	ChatMessageType: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Chat.ChatMessageType;},
		id: 1
	},
	messageBuff: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.bytes;},
		id: 2
	}});
Chat.LoginRequest = PROTO.Message("Chat.LoginRequest",{
	username: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 1
	},
	sessionid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 2
	}});
Chat.ChatContent = PROTO.Message("Chat.ChatContent",{
	username: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 1
	},
	sessionid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 2
	},
	chatContent: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 3
	}});
Chat.SingleRoomEnter = PROTO.Message("Chat.SingleRoomEnter",{
	username: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 1
	},
	sessionid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 2
	},
	deskid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.int32;},
		id: 3
	}});
Chat.StatusResponse = PROTO.Message("Chat.StatusResponse",{
	username: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 1
	},
	sessionid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 2
	},
	status: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 3
	},
	color: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Chat.Color;},
		id: 4
	},
	message_content: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 5
	}});
Chat.PreparedReady = PROTO.Message("Chat.PreparedReady",{
	username: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 1
	},
	sessionid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 2
	},
	ready: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.int32;},
		id: 3
	}});
Chat.ReadyResponse = PROTO.Message("Chat.ReadyResponse",{
	username: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 1
	},
	sessionid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 2
	},
	ReadyType: PROTO.Enum("Chat.ReadyResponse.ReadyType",{
		UNREADY :0,
		SINGLEREADY :1,
		BOTHREADY :2	}),
	readyType: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Chat.ReadyResponse.ReadyType;},
		id: 3
	}});
Chat.BackToMainHall = PROTO.Message("Chat.BackToMainHall",{
	username: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 1
	},
	sessionid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 2
	},
	deskid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 3
	},
	color: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Chat.Color;},
		id: 4
	}});
Chat.BackHallResponse = PROTO.Message("Chat.BackHallResponse",{
	username: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 1
	},
	sessionid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 2
	},
	color: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Chat.Color;},
		id: 3
	}});
Chat.SendPlayMap = PROTO.Message("Chat.SendPlayMap",{
	username: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 1
	},
	sessionid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 2
	},
	playMap: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.string;},
		id: 3
	},
	delete_key: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.string;},
		id: 4
	}});
Chat.PlayWin = PROTO.Message("Chat.PlayWin",{
	username: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 1
	},
	sessionid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 2
	}});
Chat.LogOut = PROTO.Message("Chat.LogOut",{
	username: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 1
	},
	sessionid: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 2
	}});
