// Контейнер для всех виджетов
const DashboardWidgets = {};

// Контейнер для контроллеров виджетов
const DashboardControllers = {};

const WaMobileDashboard = ( function($) {
    return class WaMobileDashboard {
        constructor(options) {
            this.$wrapper = options.$wrapper
            this.$header = options.$header
            this.$notification_wrapper = $('.js-notification-wrapper')
            this.$notification_close_selector = '.js-announcement-close';
            this.$dashboard_widgets_wrapper = $('.js-dashboard-widgets-wrapper')
            this.$bottombar = $('.js-bottombar')
            this.$dashboard_tabs = this.$wrapper.find('.dashboard-tabs')
            this.$dashboard_apps = this.$wrapper.find('.js-dashboard-apps > ul')

            this.switchBottombar()
            this.searchPanel()
            setInterval(this.updateCount, 60000);
            this.closeNotification()
            this.switchDashboards()
            //this.sortableApps()
        }

        searchPanel() {
            let that = this,
                $button = that.$header.find('.js-header-search'),
                button_text_default = $button.html(),
                button_text_close = '<span><i class="fas fa-times"></i></span>',
                $form = that.$header.find('form')

            $button.on('click', function () {
                $form.toggleClass('active')
                if ($form.hasClass('active')) {
                    $form.find('input').focus();
                    $button.html(button_text_close);
                } else {
                    $button.html(button_text_default);
                }
            })
        }

        switchBottombar() {
            let that = this,
                $bottombar_item = that.$bottombar.find('li'),
                current_item = localStorage.getItem('wa/dashboard/mobile/nav') || false,
                $dashboard_home_tab = that.$dashboard_tabs.find('ul > li:first-child');

            $bottombar_item.each(function () {
                let $item = $(this),
                    nav = $item.find('a').data('nav');

                if (current_item && nav === current_item) {
                    $item.addClass('selected').siblings().removeClass('selected')
                    that.$wrapper.find(`section[data-nav="${current_item}"]`).show().siblings().hide()
                }
            })

            $bottombar_item.on('click touchstart', 'a', function (e) {
                e.preventDefault();
                let nav = $(this).data('nav'),
                    $item = $(this).closest('li');

                $item.addClass('selected').siblings().removeClass('selected')
                $dashboard_home_tab.addClass('selected').siblings().removeClass('selected')
                that.$wrapper.find(`section[data-nav="${nav}"]`).show().siblings().hide()
                localStorage.setItem('wa/dashboard/mobile/nav', nav);

            })
        }

        updateCount() {
            let that = this,
                $dashboard_apps = $('.js-dashboard-apps');

            $.ajax({
                url: backend_url + "?action=count",
                data: {'background_process': 1},
                success: function (response) {
                    if (response && response.status == 'ok') {
                        // announcements
                        if (response.data.__announce) {
                            $('#wa-announcement').remove();
                            $dashboard_apps.before(response.data.__announce);
                            delete response.data.__announce;
                        }

                        // applications
                        $dashboard_apps.find('a span.badge').hide();
                        for (let app_id in response.data) {
                            if(response.data.hasOwnProperty(app_id)){
                                let n = response.data[app_id];
                                if (n) {
                                    let a = $dashboard_apps.find('> ul > li[data-app="' + app_id + '"] a');
                                    if (typeof (n) == 'object') {
                                        a.attr('href', n.url);
                                        n = n.count;
                                    }
                                    if (a.find('span.badge').length) {
                                        if (n && n !== "0") {
                                            a.find('span.badge').html(n).show();
                                        } else {
                                            a.find('span.badge').remove();
                                        }
                                    } else if(n && n !== "0") {
                                        a.append('<span class="badge">' + n + '</span>');
                                    }
                                } else {
                                    $dashboard_apps.find('> ul > li[data-app="' + app_id + '"] a span.badge').remove();
                                }
                            }
                        }
                        $(document).trigger('wa.appcount', response.data);
                    }
                    //setTimeout(that.updateCount, 1000);
                },
                error: function () {
                    //setTimeout(that.updateCount, 1000);
                },
                dataType: "json",
                async: true
            });
        }

        closeNotification() {
            const that = this;
            const $wa_notifications_bell = $('.js-notifications-bell');
            const $wa_announcement_counter = $wa_notifications_bell.find('.badge');
            const wa_notifications = that.$notification_wrapper.find('li.js-wa-announcement');
            let counter = wa_notifications.length;

            if (counter > 0) {
                $wa_announcement_counter.text(counter);
            }else{
                $wa_announcement_counter.remove();
            }

            $('#wa_announcement').on('click touchstart', that.$notification_close_selector, function (e) {
                e.stopPropagation();
                e.preventDefault()

                let $close = $(this),
                    $notification_block = $close.closest('.js-wa-announcement,.js-announcement-group'),
                    app_id = $close.data('app-id') || $notification_block.data('app-id'),
                    contact_id = $notification_block.data('contact-id');

                if ($notification_block.length) {
                    const key = $notification_block.data('key');
                    if (key) {
                        $notification_block.closest('.js-announcement-group').remove();
                    } else {
                        $notification_block.remove();
                    }
                    let counter = that.$notification_wrapper.find('li.js-wa-announcement').length;

                    if (!$('.js-announcement-group.is-unread-group').length) {
                        $('#js-show-all-notifications').remove();
                    }

                    if (key && app_id === 'installer') {
                        $.post(`${backend_url}installer/?module=announcement&action=hide`, { key, app_id }, function(response) {
                            if (response === 'ok') {
                                let $system_notification_wrapper = $('.js-wa-announcement-wrap');
                                let system_notification_count = $system_notification_wrapper.find('.js-wa-announcement').length;
                                if (system_notification_count <= 0) {
                                    $wa_announcement_counter.text(counter);
                                    if (!counter) {
                                        $wa_announcement_counter.remove();
                                    }
                                    $system_notification_wrapper.closest('.js-wa-announcement').remove();
                                }
                            }
                        });
                    } else {
                        const payload = {
                            app_id,
                            name: 'announcement_close',
                            value: 'now()',
                            ...(contact_id ? { contact_id } : {})
                        };
                        $.post(`${backend_url}?module=settings&action=save`, payload, response => {
                            if (response && response.status === 'ok') {
                                if (counter === 0) {
                                    $wa_announcement_counter.remove();
                                }else{
                                    $wa_announcement_counter.text(counter);
                                }
                            }
                        });
                    }

                    if (counter) {
                        $wa_announcement_counter.text(counter)
                    }else{
                        $wa_announcement_counter.remove();
                    }
                } else {
                    $wa_announcement_counter.remove();
                }

            });
        }

        switchDashboards() {
            const that = this,
                $default_dashboard = document.querySelector('.d-widgets-block'),
                $user_dashboard = $('.js-dashboard-widgets-page');

            let is_move_event = false;

            $user_dashboard.on('touchmove', function () {
                is_move_event = true;
            })

            $user_dashboard.on('touchend', function () {
                if (is_move_event) {
                    is_move_event = false
                    return;
                }

                let self = $(this),
                    id = self.data('dashboard'),
                    waLoading = $.waLoading();

                if (id == 0) {
                    that.$bottombar.find('[data-nav="widgets"]').trigger('click')
                    self.parent().addClass('selected').siblings().removeClass('selected');
                    return;
                }

                waLoading.show();

                $.ajax({
                    xhr: function () {
                        let xhr = new window.XMLHttpRequest();
                        if (window.ActiveXObject) {
                            xhr = new window.ActiveXObject("Microsoft.XMLHTTP");
                        }

                        xhr.addEventListener("progress", downloadProgressHandler, false);
                        xhr.addEventListener("load", loadHandler, false);
                        xhr.addEventListener("error", errorHandler, false);
                        xhr.addEventListener("abort", abortHandler, false);
                        return xhr;
                    },
                    url: '?module=dashboard&action=Dashboard',
                    type: "POST",
                    data: { id },
                    contentType: false,
                    processData: true,
                    success: function(response) {
                        const $dashboard_page = $(response)[0],
                            $dashboard_page_html = $dashboard_page.querySelector('.js-dashboard-widgets').innerHTML;

                        if ($dashboard_page_html !== undefined) {
                            that.$dashboard_widgets_wrapper.empty().html($dashboard_page_html);
                        }

                        self.parent().addClass('selected').siblings().removeClass('selected');
                    }
                });

                function downloadProgressHandler(event) {
                    if ( event.lengthComputable ) {
                        let percent = (event.loaded / event.total) * 100;
                        waLoading.set(percent);
                    }else{
                        waLoading.animate();
                    }
                }

                function loadHandler() {
                    waLoading.done();
                }

                function errorHandler() {
                    waLoading.abort();
                }

                function abortHandler() {
                    waLoading.abort();
                }
            });

            is_move_event = false;
            /* Set Default Dashboard */
            that.$bottombar.on('click touchstart', 'a[data-nav="widgets"]', function (e){
                e.preventDefault();
                that.$dashboard_widgets_wrapper.empty().html($default_dashboard);
            })
        }

        sortableApps() {
            let that = this;

            var app_list_sortable = () => {
                that.$dashboard_apps.sortable({
                    delay: 0,
                    delayOnTouchOnly: true,
                    animation: 150,
                    dataIdAttr: 'data-app',
                    forceFallback: true,
                    onEnd() {
                        let data = this.toArray(),
                            apps = [];

                        for (let i = 0; i < data.length; i++) {
                            let id = $.trim(data[i]);
                            if (id) {
                                apps.push(id);
                            }
                        }

                        let url = backend_url + "?module=settings&action=save";
                        $.post(url, {name: 'apps', value: apps});
                    }
                })
            }

            if(typeof Sortable !== 'undefined') {
                app_list_sortable()
            } else {
                let urls = [`${wa_url}wa-content/js/sortable/sortable.min.js`, `${wa_url}wa-content/js/sortable/jquery-sortable.min.js`];
                const sortableDefer = $.Deferred();
                for (let i = 0; i < urls.length; i++) {
                    sortableDefer.then(function () {
                        return $.ajax({
                            cache: true,
                            dataType: "script",
                            url: urls[i]
                        });
                    });
                }

                $.when.apply($, sortableDefer).done(app_list_sortable);
            }
        }
    }
})(jQuery);

const DashboardWidget = (function($) {
    return class DashboardWidget {
        constructor(options) {
            // Settings
            this.widget_id = ( options.widget_id || false );
            this.widget_href = ( options.widget_href || false );
            this.widget_sort = parseInt( ( options.widget_sort || 0 ) );
            this.widget_group_index = parseInt( ( options.widget_group_index || 0 ) );
            this.widget_size = {
                width: parseInt( ( options.widget_size.width || 0 ) ),
                height: parseInt( ( options.widget_size.height || 0 ) )
            };
            this.widget_size_class = false;

            this.storage = {
                widget_type: {
                    "1": {
                        "1": "widget-1x1",
                        "2": "widget-1x2"
                    },
                    "2": {
                        "1": "widget-2x1",
                        "2": "widget-2x2"
                    }
                }
            };

            // DOM
            this.$widget = $("#widget-" + this.widget_id);
            this.$widget_wrapper = $("#widget-wrapper-" + this.widget_id);

            // Functions
            this.renderWidget(true);
        }

        renderWidget(force) {
            let that = this,
                widget_href = that.widget_href + "&id=" + that.widget_id + "&size=" + that.widget_size.width + "x" + that.widget_size.width,
                $widget = that.$widget;

            if ($widget.length) {

                // Проставляем класс (класс размера виджета)
                that.setWidgetType();

                // Загружаем контент
                $.ajax({
                    url: widget_href,
                    dataType: 'html',
                    global: false,
                    data: {}
                }).done(function(r) {
                    $widget.html(r);
                }).fail(function() {
                    if (force) {
                        $widget.html("");
                    }
                });
            }
        }

        setWidgetType() {
            let that = this,
                widget_width = that.widget_size.width,
                widget_height = that.widget_size.height,
                current_widget_type_class = that.widget_size_class;

            if ( widget_width > 0 && widget_height > 0 ) {
                let widget_type_class = that.storage.widget_type[widget_width][widget_height];

                if (widget_type_class) {

                    // Remove Old Type
                    if (current_widget_type_class) {

                        // Если новый класс равен старому
                        if (current_widget_type_class && ( current_widget_type_class == widget_type_class) ) {
                            return false;
                        }

                        that.$widget_wrapper.removeClass(that.widget_size_class);
                    }

                    // Set New Type
                    that.$widget_wrapper.addClass(widget_type_class);

                    that.widget_size_class = widget_type_class;
                }
            }
        }
    }
})(jQuery);

const Page = ( function($, backend_url) {
    return class Page {

        constructor() {
            this.storage = {
                isLoadingClass: "is-loading",
                hiddenClass: "hidden",
                showClass: "is-shown",
                animateClass: "is-animated",
                lazyLoadCounter: 0,
                isBottomLazyLoadLocked: false,
                isTopLazyLoadLocked: false,
                isActivityFilterLocked: false,
                topLazyLoadingTimer: 0,
                activityFilterTimer: 0,
                lazyTime: 15 * 1000,
                getPageWrapper: function() {
                    return $("#wa_widgets");
                },
                getWidgetActivity: function() {
                    return $("#wa_activity");
                },
                getSettingsWrapper: function() {
                    return $("#d-settings-wrapper");
                },
            };


            this.bindEvents();
        }

        bindEvents() {
            let that = this,
                $widgetActivity = that.storage.getWidgetActivity();

            $widgetActivity.find('.d-load-more-animation').hide()
            $widgetActivity.find('#d-load-more-activity').show()

            $widgetActivity.on("click", "#d-load-more-activity", function () {
                that.loadOldActivityContent( $(this), $widgetActivity );
                return false;
            });

            const applyFilter = () => {
                if (that.storage.activityFilterTimer) {
                    clearTimeout(that.storage.activityFilterTimer);
                }
                if (that.storage.topLazyLoadingTimer) {
                    clearTimeout(that.storage.topLazyLoadingTimer);
                }

                that.showLoadingAnimation($widgetActivity);

                that.storage.activityFilterTimer = setTimeout( function() {
                    that.showFilteredData( $widgetActivity );
                }, 2000);

                that.storage.topLazyLoadingTimer = setTimeout( function() {
                    that.loadNewActivityContent($widgetActivity);
                }, that.storage.lazyTime );
            };
            $("#activity-filter input:checkbox").on("change", function() {
                applyFilter();

                // Change Text
                that.changeFilterText();

                return false;
            });
            $("#activity-filter .tabs li[data-group-id]").on("click", function() {
                const $li = $(this);
                $li.siblings().removeClass('selected');
                $li.addClass('selected');

                applyFilter();

                return false;
            });

            that.storage.topLazyLoadingTimer = setTimeout(function () {
                that.loadNewActivityContent($widgetActivity);
            }, that.storage.lazyTime);
        }

        showFirstNotice() {
            let that = this,
                $wrapper = that.storage.getFirstNoticeWrapper(),
                $activity = that.storage.getWidgetActivity(),
                showNotice = $wrapper.data("show-notice"),
                $notifications = that.storage.getNotifications();

            if (showNotice) {
                $activity.addClass(that.storage.hiddenClass);
                $notifications.addClass(that.storage.hiddenClass);
                $wrapper.show();
            }
        }

        hideFirstNotice() {
            let that = this,
                $wrapper = that.storage.getFirstNoticeWrapper(),
                $activity = that.storage.getWidgetActivity(),
                $notifications = that.storage.getNotifications();

            // hide DOM
            $wrapper.hide();

            $activity
                .removeClass(that.storage.hiddenClass)
                .addClass(that.storage.animateClass);

            $notifications
                .removeClass(that.storage.hiddenClass)
                .addClass(that.storage.animateClass);

            setTimeout( function() {
                $activity.addClass(that.storage.showClass);
                $notifications.addClass(that.storage.showClass);
            }, 4);

            // set data
            $.post(that.storage.getCloseTutorialHref(), {});
        }

        changeFilterText() {
            let $filterText = $("#activity-select-text"),
                text = $filterText.data("text"),
                $form = $("#activity-filter"),
                check_count = 0,
                full_checked = true;

            $form.find("input:checkbox").each( function() {
                let $input = $(this),
                    is_checked = ( $input.attr("checked") == "checked" );

                if (!is_checked) {
                    full_checked = false;
                } else {
                    check_count++;
                }
            });

            if (full_checked) {
                $filterText.text(text);
            } else {
                text += " (" + check_count + ")";
                $filterText.text(text);
            }
        }

        showFilteredData( $widgetActivity) {
            let that = this;
            if (!that.storage.isActivityFilterLocked) {
                that.storage.isActivityFilterLocked = true;

                let $wrapper = $widgetActivity.find(".js-activity-list-block"),
                    $form = $("#activity-filter"),
                    $deferred = $.Deferred(),
                    ajaxHref = "?module=dashboard&action=activity",
                    dataArray = $form.serializeArray();

                dataArray.push({
                    name: "save_filters",
                    value: 1
                });

                const group_id = $form.find('li.selected[data-group-id]').data('group-id');
                if (group_id) {
                    dataArray.push({
                        name: "group_id",
                        value: group_id
                    });
                }

                $.post(ajaxHref, dataArray, function (response) {
                    $deferred.resolve(response);
                });

                $deferred.done( function(response) {
                    let html = "<div class=\"empty-activity-text\">" + $wrapper.data("empty-text") + "</div>";
                    if ( $.trim(response).length ) {
                        html = response;
                    }
                    $wrapper.html(html);

                    that.hideLoadingAnimation($widgetActivity);

                    /*TODO check vice versa case*/
                    $widgetActivity.find('.activity-empty-today').remove();
                    const is_empty_today_header = !$widgetActivity.find('.activity-divider.today').not('.hidden').length;
                    if (is_empty_today_header) {
                        $widgetActivity.find('.activity-divider.hidden:first').removeClass('hidden');
                    }

                    that.storage.isActivityFilterLocked = false;

                    const today = $wrapper.data("today-text");
                    if ($wrapper.find('.activity-divider:first').text() !== today) {
                        const empty_today = $wrapper.data("empty-today-text");
                        $wrapper.prepend(`<div class="activity-divider h3${is_empty_today_header ? '' : ' hidden'}">${today}</div>
                                            <div class="activity-item activity-empty-today custom-mb-24">
                                                <div class="item-content-wrapper">
                                                    <div class="inline-content">${empty_today}</div>
                                                </div>
                                            </div>`);
                    }
                });
            }
        }

        loadOldActivityContent($link, $widgetActivity) {
            let that = this;
            // Save data
            if (!that.storage.isBottomLazyLoadLocked) {
                that.storage.isBottomLazyLoadLocked = true;

                that.showLoadingAnimation($widgetActivity);

                let $linkWrapper = $link.closest(".show-more-activity-wrapper"),
                    $wrapper = $widgetActivity.find(".js-activity-list-block"),
                    max_id = $wrapper.find(".activity-item:last").data('id'),
                    $deferred = $.Deferred(),
                    ajaxHref = "?module=dashboard&action=activity",
                    dataArray = {
                        max_id: max_id
                    };

                $.post(ajaxHref, dataArray, function (response) {
                    $deferred.resolve(response);
                });

                $deferred.done( function(response) {
                    // Remove Link
                    $linkWrapper.remove();

                    // Render
                    $wrapper.append(response);

                    that.storage.isBottomLazyLoadLocked = false;
                    that.storage.lazyLoadCounter++;

                    that.hideLoadingAnimation($widgetActivity);
                });
            }
        }

        loadNewActivityContent($widgetActivity) {
            let that = this;
            // Save data
            if (!that.storage.isTopLazyLoadLocked) {
                that.storage.isTopLazyLoadLocked = true;

                that.showLoadingAnimation($widgetActivity);

                let $wrapper = $widgetActivity.find(".js-activity-list-block"),
                    min_id = $wrapper.find(".activity-item:not(.activity-empty-today):first").data('id'),
                    $deferred = $.Deferred(),
                    ajaxHref = "?module=dashboard&action=activity",
                    dataArray = {
                        min_id: min_id
                    };

                $.post(ajaxHref, dataArray, function (response) {
                    $deferred.resolve(response);
                });

                $deferred.done( function(response) {
                    if ( $.trim(response).length && !response.includes('activity-empty-today')) {
                        // Render
                        $widgetActivity.find(".empty-activity-text").remove();
                        $widgetActivity.find(".activity-item.activity-empty-today").remove();
                        const $today_divider = $widgetActivity.find('.js-activity-list-block > .activity-divider.today');
                        if ($today_divider.length) {
                            $today_divider.after(response)
                        }else{
                            $wrapper.prepend(response);
                        }

                        if (!$widgetActivity.find('.activity-divider.today').not('.hidden').length) {
                            $widgetActivity.find('.activity-divider.hidden:first').removeClass('hidden');
                        }

                        const $activity_divider = $wrapper.find('.activity-divider');
                        let uniqueTexts = [];
                        $activity_divider.each(function() {
                            const text = $(this).text();
                            if ($.inArray(text, uniqueTexts) === -1) {
                                uniqueTexts.push(text);
                            } else {
                                $(this).remove();
                            }
                        });
                    }

                    that.storage.isTopLazyLoadLocked = false;

                    if (!that.storage.is_custom_dashboard) {
                        that.storage.topLazyLoadingTimer = setTimeout( function() {
                            that.loadNewActivityContent($widgetActivity);
                        }, that.storage.lazyTime );
                    }

                    that.hideLoadingAnimation($widgetActivity);
                });
            }
        };

        showLoadingAnimation($widgetActivity) {
            $widgetActivity.find(".activity-filter-wrapper .loading").show();
        }

        hideLoadingAnimation($widgetActivity) {
            $widgetActivity.find(".activity-filter-wrapper .loading").hide();
            $widgetActivity.find('.d-load-more-animation').hide()
            $widgetActivity.find('#d-load-more-activity').show()
        }


    }
})(jQuery, backend_url);
