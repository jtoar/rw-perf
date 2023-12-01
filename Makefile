SCRIPTS_DIR := scripts

measure-test-project-6.4.1-via-pidusage-tree:
	cd $(SCRIPTS_DIR) && yarn node pidusageTree.js ../test-project-6.4.1

measure-test-project-6.4.1-via-mem-tracker:
	cd $(SCRIPTS_DIR) && yarn node memTracker.js ../test-project-6.4.1
	cd $(SCRIPTS_DIR) && open visualise/visualise.html