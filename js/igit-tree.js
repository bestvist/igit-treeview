class IGitTree {
    constructor() {
        /* default setting */
        this.setting = {
            toggle: true,
            recursive: true,
            containerWidth: "230px"
        }

        this.private_token = null;
        this.rss_token = null;
        this.rss_mode = false;
        this.findParentNodes = [];

        let href = "" + $("head link[rel='alternate']").attr("href");
        let index = href.indexOf("=");
        if (index > -1) {
            this.rss_mode = href.indexOf("rss_token") > -1;
            this.private_token = href.substring(index + 1);
            this.rss_token = href.substring(index + 1);
        }
        this.apiRootUrl = window.location.origin;
        this.project_id = $('#project_id').val() || $('#search_project_id').val();

        // 没有project元素时取项目路径 https://docs.gitlab.com/ee/api/projects.html#get-single-project
        if (!this.project_id) {
            const repo_path = location.pathname.substr(1).split(/\/blob\/|\/tree\//)[0].split('/').reduce((path, repo, index) => {
                return path + '/' + repo;
            });
            this.project_id = encodeURIComponent(repo_path);
        }
        this.apiRepoTree = this.apiRootUrl + '/api/v4/projects/' + this.project_id + '/repository/tree';
        // this.repository_ref = $('#repository_ref').val();
        this.repository_ref = $('.qa-branches-select[data-selected]').attr('data-selected');
        this.shortcuts = ("" + $(".shortcuts-project").attr("href")).substring(1);
    }

    /* 判断是否是 igit 页面 */
    isIGit() {
        return !!document.querySelector("meta[content^='GitLab']");
    }

    isFilePage() {
        return $(".shortcuts-find-file").size() > 0 || ($(".file-holder").size() > 0 && $(".sub-nav li.active a").text().trim() === 'Files');
    }

    isNull(obj) {
        if (typeof (obj) == "undefined" || obj == "undefined") {
            return true;
        } else {
            return (obj == null || obj.length <= 0) ? true : false;
        }
    }

    // 容器是否处于调整大小状态
    isResizing() {
        return !!$(".gitlabTreeView_resizable").data("resize");
    }

    //得到树对象
    getZTree() {
        return $.fn.zTree.getZTreeObj("gitlabTreeView");
    }

    getSetting() {
        return this.getLocalStorage("igit-treeview-setting");
    }

    saveSetting() {
        return this.setLocalStorage("igit-treeview-setting", this.setting);
    }

    getLocalStorage(k) {
        try {
            return localStorage.getItem(k) ? JSON.parse(localStorage.getItem(k)) : null;
        } catch (err) {
            localStorage.removeItem(k);
            return null;
        }
    }

    setLocalStorage(k, v) {
        localStorage.setItem(k, JSON.stringify(v));
    }

    showTree() {
        this.setting.toggle = true;
        this.saveSetting();

        $("html").css("margin-left", this.setting.containerWidth);
        this.handleHeaderAndSideBar();
        if (this.isResizing()) {
            $(".gitlabTreeView_sidebar").css("width", this.setting.containerWidth);
        } else {
            $(".gitlabTreeView_sidebar").animate({
                "width": this.setting.containerWidth
            }, 'fast', "linear", function () {
                $(".gitlabTreeView_toggle i").removeClass().addClass("fa fa-arrow-left");
            });
        }
    }

    hideTree() {
        this.setting.toggle = false;
        this.saveSetting();

        $("html").css("margin-left", "0px");
        this.handleHeaderAndSideBar();
        $(".gitlabTreeView_sidebar").animate({
            "width": "0px"
        }, 'fast', "linear", function () {
            $(".gitlabTreeView_toggle i").removeClass().addClass("fa fa-arrow-right");
        });
    }

    // 处理打开或关闭的时候header和sidebar的状态
    handleHeaderAndSideBar() {
        let left = this.setting.toggle ? this.setting.containerWidth : "0px";
        let header = $("header.navbar-gitlab");
        let sidebar = $(".nav-sidebar");
        if (header.length > 0 && header.css("position") === "fixed") {
            header.css("left", left);
        }
        if (sidebar.length > 0 && sidebar.css("position") === "fixed") {
            sidebar.css("left", left);
        }
    }

    showTreeNodes(nodeList, zTree) {
        this.findParentNodes = [];
        for (let i = 0; i < nodeList.length; i++) {
            this.findParent(nodeList[i], zTree);
            //显示结果节点的子节点
            if (nodeList[i].children != null) {
                zTree.showNodes(zTree.transformToArray(nodeList[i].children));
            }
        }
        //显示所有对应父节点
        zTree.showNodes(this.findParentNodes);
        //显示搜索结果叶子节点
        zTree.showNodes(nodeList);
    }

    findParent(node, zTree) {
        let pNode = node.getParentNode();
        if (pNode != null) {
            this.findParentNodes.push(pNode);
            this.findParent(pNode, zTree);
        }
    }

    findCurrentPathAndReturnNodeId(nodes) {
        let path = $("#path").val();
        if (path.length === 0) {
            return path;
        }
        let names = path.split("/");
        let node;
        for (let k in names) {
            let name = names[k];
            node = node === undefined ? nodes[name] : node.children_map[name];
            node.open = true;
        }
        return node.id;
    }

    selectNode(treeNode) {
        if (treeNode.type === 'blob' || treeNode.type === 'tree') {
            const paths = [
                window.location.origin,
                this.shortcuts,
                treeNode.type,
                this.repository_ref,
                treeNode.path
            ];
            window.location.href = paths.join('/');
        }

        // if (treeNode.type === 'blob') {
        //     let href = window.location.origin + '/' + this.shortcuts + '/blob/' + this.repository_ref + '/' + treeNode.path;

        /* 替换页面元素显示异常，改为跳转 */
        //加载文件信息
        // $.ajax({
        //     type: "GET",
        //     url: href,
        //     dataType: 'html',
        //     success: function (data) {
        //         var content = $(data).find(".content-wrapper").html();

        //         try {
        //             $(".content-wrapper").html(content);
        //         } catch (err) {
        //             //console.info(err);
        //         } finally {
        //             //加载内容
        //             $.ajax({
        //                 type: "GET",
        //                 url: href + '?format=json&viewer=simple',
        //                 dataType: 'json',
        //                 success: function (result) {
        //                     $(".blob-viewer").replaceWith(result.html)
        //                 }
        //             });
        //         }

        //     }
        // })

        // } else if (treeNode.type === 'tree') {
        //     let href = window.location.origin + '/' + this.shortcuts + '/tree/' + this.repository_ref + '/' + treeNode.path;
        // $.ajax({
        //     type: "GET",
        //     url: href,
        //     dataType: 'html',
        //     success: function (data) {
        //         var content = $(data).find(".content-wrapper").html();

        //         try {
        //             $(".content-wrapper").html(content);
        //         } catch (err) {
        //             //console.info(err);
        //         } finally {}
        //     }
        // })
        // }
    }

    loadNode(parentNode) {
        if (parentNode && (parentNode.zAsync || parentNode.isAjaxing)) {
            return;
        }

        if (parentNode) {
            parentNode.isAjaxing = true;
            this.getZTree().updateNode(parentNode);
            //ztree class update
            $("#" + parentNode.tId + "_ico").attr({
                style: "",
                "class": "button" + " " + "ico_loading"
            });
        }

        let param = {
            id: this.project_id,
            path: parentNode ? parentNode.path : null,
            ref: this.repository_ref
        };

        // if (this.rss_mode) {
        //     param.rss_token = this.rss_token;
        // } else {
        //     param.private_token = this.private_token;
        // }

        $.get(this.apiRepoTree, param, (result) => {
            if (parentNode) {
                parentNode.isAjaxing = false;
                parentNode.zAsync = true;
                this.getZTree().updateNode(parentNode);
            }

            let treeArr = [];

            if (result) {
                for (let i = 0; i < result.length; i++) {
                    let node = result[i];
                    if (node.type === 'tree') {
                        node.isParent = true;
                    }
                    treeArr.push(node);
                }
            }
            this.getZTree().addNodes(parentNode, result.length, treeArr);
        });
    }

    loadRecursiveNode() {
        let param = {
            id: this.project_id,
            recursive: true,
            ref_name: this.repository_ref,
            // per_page: 100000 // api v4需要加per_page参数，默认20
        };

        // if (this.rss_mode) {
        //     param.rss_token = this.rss_token;
        // } else {
        //     param.private_token = this.private_token;
        // }

        $.get(this.apiRepoTree, param, (result) => {
            let treeArr = [];

            if (result) {
                // Convert the response data to another structure which can be accepted by ztree.
                for (let i = 0; i < result.length; i++) {
                    let node = result[i];
                    if (node.type === 'tree') {
                        node.isParent = true;
                        node.children = [];
                        node.children_map = {};
                    }

                    let path_fragments = node.path.split('/');
                    if (path_fragments.length === 1) { // root level
                        treeArr[path_fragments[0]] = node;
                        treeArr.push(node);
                    } else { // sub level
                        let parent = treeArr[path_fragments[0]];
                        for (let j = 1; j < path_fragments.length - 1; j++) {
                            parent = parent.children_map[path_fragments[j]];
                        }
                        parent.children_map[path_fragments[path_fragments.length - 1]] = node;
                        parent.children.push(node);
                    }
                }
            }
            let selectNodeId = this.findCurrentPathAndReturnNodeId(treeArr);
            let ztree = this.getZTree();
            ztree.addNodes(null, result.length, treeArr);
            ztree.selectNode(ztree.getNodeByParam("id", selectNodeId));
        });
    }

    // 监听插件显示隐藏事件
    listenToggle() {
        $(".gitlabTreeView_toggle").on('click', () => {
            if ($(".gitlabTreeView_sidebar").width() > 0) {
                this.hideTree();
            } else {
                this.showTree();
            }
        });
    }

    // 监听插件宽度调整
    listenResize() {
        // 调整容器宽度，最小宽度100px
        $(".gitlabTreeView_resizable").on("mousedown", function () {
            $(this).data("resize", true);
        }).on("mouseup", function () {
            $(this).data("resize", false);
        });
        $(document).on("mousemove", (event) => {
            if (this.isResizing()) {
                let width = event.clientX < 100 ? 100 : event.clientX;
                this.setting.containerWidth = width + "px";
                this.showTree();
                event.preventDefault();
            }
        }).on("mouseup", () => {
            if (this.isResizing()) {
                $(".gitlabTreeView_resizable").data("resize", false);
            }
        });
    }

    listenSearch() {
        /** search input */
        $(".gitlabTreeView_search_text").on("keyup", (event) => {
            let value = $(".gitlabTreeView_search_text").val();

            if (this.isNull(value)) {
                $(".gitlabTreeView_search_icon").addClass("fa-search").removeClass("fa-remove active");
            } else {
                $(".gitlabTreeView_search_icon").addClass("fa-remove active").removeClass("fa-search");
            }

            if (event.keyCode == 13) {
                this.search(value);
            }
        });

        /** clear value and search */
        $(".gitlabTreeView_search_icon").on('click', () => {
            $(".gitlabTreeView_search_text").val('');
            this.search('');
        });
    }

    listenConfig() {
        const vm = this;
        $(".gitlabTreeView_cog_icon").on("click", () => {
            $(".gitlabTreeView_header_setting").slideToggle();
        })

        /** saveSetting */
        $(".gitlabTreeView_header_setting_save").on("click", function () {
            $(".gitlabTreeView_header_setting input[type=checkbox]").each(function () {
                let name = $(this).attr('name');
                vm.setting[name] = $(this).is(':checked');
                vm.saveSetting();
            });

            $(".gitlabTreeView_header_setting").slideUp();
        })

        $(".gitlabTreeView_header_setting input[type=checkbox]").each(function () {
            let name = $(this).attr('name');
            let value = vm.setting[name];
            $(this).prop('checked', value);
        });
    }

    search(value) {
        let treeObj = this.getZTree();
        let allNode = treeObj.transformToArray(treeObj.getNodes());

        if (!this.isNull(value)) {
            let nodeList = treeObj.getNodesByParamFuzzy("name", value);
            if (nodeList.length > 0) {
                treeObj.hideNodes(allNode);
                this.showTreeNodes(nodeList, treeObj);
                treeObj.expandAll(true);
            } else {
                treeObj.hideNodes(allNode);
            }
        } else {
            treeObj.showNodes(allNode);
            //折叠所有节点
            treeObj.expandAll(false);
        }
    }

    initView() {
        const nav = `
        <nav class='gitlabTreeView_sidebar'>
            <a class='gitlabTreeView_toggle'><i class='fa fa-arrow-left'></i></a>
            <div class='gitlabTreeView_content'>
                <div class='gitlabTreeView_resizable'></div>
                <div class='gitlabTreeView_header'>
                    <div class='gitlabTreeView_header_repo'>
                        <i class='fa fa-bookmark gitlabTreeView_tab'></i>${this.shortcuts.replace('/',' / ')}
                    </div>
                    <div class='gitlabTreeView_header_branch'>
                        <i class='fa fa-share-alt gitlabTreeView_tab'></i>${this.repository_ref}
                    </div>
                    <div class='gitlabTreeView_header_search'>
                        <input type='search' class='gitlabTreeView_search_text' placeholder='Search' />
                        <i class='fa fa-search gitlabTreeView_search_icon'></i> 
                        <i class='fa fa-cog gitlabTreeView_cog_icon'></i>
                    </div>
                    <div class='gitlabTreeView_header_setting'>
                        <div>
                            <label>
                                <input type='checkbox' name='recursive' checked> Load entire tree at once
                            </label>
                        </div>
                        <div>
                            <button class='gitlabTreeView_header_setting_save'>Save</button>
                        </div>
                    </div>
                </div>
                <div class='gitlabTreeView_body'>
                    <ul class='ztree' id='gitlabTreeView'></ul>
                </div>
            </div>
        </nav>
        `;
        $("body").append($(nav));

    }

    initTree() {
        let setting = {
            view: {
                showLine: false
            },
            data: {
                key: {
                    name: "name"
                },
                simpleData: {
                    enable: true,
                    idKey: "id",
                    pIdKey: "pid",
                    rootPId: "0"
                }
            },
            callback: {
                onClick: (event, treeId, treeNode) => {
                    if (treeNode.type === 'tree') {
                        let ztree = this.getZTree();
                        ztree.expandNode(treeNode, !treeNode.open, false, true)
                        
                        if (this.setting.recursive) {
                            return;
                        }
                        this.loadNode(treeNode);
                    } else {
                        this.selectNode(treeNode);
                    }
                },
                onExpand: (event, treeId, treeNode) => {
                    if (this.setting.recursive) {
                        return;
                    }
                    this.loadNode(treeNode);
                }
            }
        };

        $.fn.zTree.init($("#gitlabTreeView"), setting);
    }

    init() {
        if (!this.isIGit() || !this.isFilePage()) {
            return;
        }

        this.initView();

        // setting
        this.setting = this.getSetting() || this.setting;

        if (this.setting.toggle) {
            this.showTree();
        } else {
            this.hideTree();
        }

        this.listenToggle();
        this.listenResize();
        this.listenSearch();
        this.listenConfig();

        this.initTree();

        if (this.setting.recursive) {
            this.loadRecursiveNode();
        } else {
            this.loadNode(null);
        }
    }

}