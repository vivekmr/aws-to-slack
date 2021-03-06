"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class CodeDeployParser {

	parse(event) {
		return BbPromise.try(() => _.isObject(event) ? event : JSON.parse(event))
		.catch(_.noop) // ignore JSON errors
		.then(event => {
			if (_.get(event, "source") !== "aws.codedeploy") {
				return BbPromise.resolve(false);
			}

			const time = new Date(_.get(event, "time"));
			const deployState = _.get(event, "detail.state");
			const deploymentGroup = _.get(event, "detail.deploymentGroup");
			const deploymentId = _.get(event, "detail.deploymentId");
			const app = _.get(event, "detail.application");
			const statusUrl = `https://console.aws.amazon.com/codedeploy/home?region=${event.region}#/deployments/${deploymentId}`;
			const fields = [];

			let color = Slack.COLORS.neutral;
			const baseTitle = `CodeDeploy Application ${app}`;
			let title = baseTitle;
			if (deployState === "SUCCESS") {
				title = `<${statusUrl}|${baseTitle}> has finished`;
				color = Slack.COLORS.ok;
			}
			else if (deployState === "STOP") {
				title = `<${statusUrl}|${baseTitle}> was stopped`;
				color = Slack.COLORS.warning;
			}
			else if (deployState === "FAILURE") {
				title = `<${statusUrl}|${baseTitle}> has failed`;
				color = Slack.COLORS.critical;
			}
			else if (deployState === "START") {
				title = `<${statusUrl}|${baseTitle}> has started deploying`;
			}

			if (deployState) {
				fields.push({
					title: "Status",
					value: deployState,
					short: true
				});
			}

			fields.push({
				title: "DeploymentGroup",
				value: `${deploymentGroup}`,
				short: true
			});

			const slackMessage = {
				attachments: [{
					author_name: "AWS CodeDeploy Notification",
					fallback: `${baseTitle} ${deployState}`,
					color: color,
					title: title,
					fields: fields,
					mrkdwn_in: [ "title", "text" ],
					ts: Slack.toEpochTime(time)
				}]
			};
			return BbPromise.resolve(slackMessage);
		});
	}
}

module.exports = CodeDeployParser;
