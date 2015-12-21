/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

import VideoModel from '../models/VideoModel.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';

function EventController() {

    const MPD_RELOAD_SCHEME = "urn:mpeg:dash:event:2012";
    const MPD_RELOAD_VALUE = 1;

    let context = this.context;
    let log = Debug(context).getInstance().log;

    let instance,
        inlineEvents, // Holds all Inline Events not triggered yet
        inbandEvents, // Holds all Inband Events not triggered yet
        activeEvents, // Holds all Events currently running
        eventInterval, // variable holding the setInterval
        refreshDelay, // refreshTime for the setInterval
        presentationTimeThreshold,
        manifestModel,
        manifestUpdater;

    function initialize() {
        inlineEvents = {};
        inbandEvents = {};
        activeEvents = {};
        eventInterval = null;
        refreshDelay = 100;
        presentationTimeThreshold = refreshDelay / 1000;
    }

    function clear() {
        if(eventInterval !== null) {
            clearInterval(eventInterval);
            eventInterval = null;
        }
    }

    function start() {
        log("Start Event Controller");
        if (!isNaN(refreshDelay)) {
            eventInterval = setInterval(onEventTimer, refreshDelay);
        }
    }

    /**
     * Add events to the eventList. Events that are not in the mpd anymore but not triggered yet will still be deleted
     * @param values
     */
    function addInlineEvents(values) {
        inlineEvents = {};

        if(values) {
            for(var i = 0; i < values.length; i++) {
                var event = values[i];
                inlineEvents[event.id] = event;
                log("Add inline event with id " + event.id);
            }
        }
        log("Added " + values.length + " inline events");
    }

    /**
     * i.e. processing of any one event message box with the same id is sufficient
     * @param values
     */
    function addInbandEvents(values) {
        for(var i = 0; i < values.length; i++) {
            var event = values[i];
            if (!(event.id in inbandEvents)) {
                inbandEvents[event.id] = event;
                log("Add inband event with id " + event.id);
            } else {
                log("Repeated event with id " + event.id);
            }

        }
    }

    /**
     * Itereate through the eventList and trigger/remove the events
     */
    function onEventTimer() {
        triggerEvents(inbandEvents);
        triggerEvents(inlineEvents);
        removeEvents();
    }

    function triggerEvents(events) {
        var currentVideoTime = VideoModel(context).getInstance().getCurrentTime();
        var presentationTime;

        /* == Trigger events that are ready == */
        if(events) {
            var eventIds = Object.keys(events);
            for (var i = 0; i < eventIds.length; i++) {
                var eventId = eventIds[i];
                var curr = events[eventId];

                if (curr !== undefined) {
                    presentationTime = curr.presentationTime / curr.eventStream.timescale;
                    if (presentationTime === 0 || (presentationTime <= currentVideoTime && presentationTime + presentationTimeThreshold > currentVideoTime)) {
                        log("Start Event " + eventId + " at " + currentVideoTime);
                        if (curr.duration > 0) activeEvents[eventId] = curr;
                        if (curr.eventStream.schemeIdUri == MPD_RELOAD_SCHEME && curr.eventStream.value == MPD_RELOAD_VALUE) refreshManifest();
                        delete events[eventId];
                    }
                }
            }
        }
    }

    /**
     * Remove events from the list that are over
     */
    function removeEvents() {
        if(activeEvents) {
            var currentVideoTime = VideoModel(context).getInstance().getCurrentTime();
            var eventIds = Object.keys(activeEvents);

            for (var i = 0; i < eventIds.length; i++) {
                var eventId = eventIds[i];
                var curr = activeEvents[eventId];
                if (curr !== null && (curr.duration + curr.presentationTime) / curr.eventStream.timescale < currentVideoTime) {
                    log("Remove Event " + eventId + " at time " + currentVideoTime);
                    curr = null;
                    delete activeEvents[eventId];
                }
            }
        }

    }

    function refreshManifest() {
        var manifest = manifestModel.getValue();
        var url = manifest.url;

        if (manifest.hasOwnProperty("Location")) {
            url = manifest.Location;
        }
        log("Refresh manifest @ " + url);
        manifestUpdater.getManifestLoader().load(url);
    }

    function setConfig(config) {
        if (!config) return;

        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }

        if (config.manifestUpdater) {
            manifestUpdater = config.manifestUpdater;
        }
    }

    function reset() {
        clear();
        inlineEvents = null;
        inbandEvents = null;
        activeEvents = null;
    }

    instance = {
        initialize: initialize,
        addInlineEvents : addInlineEvents,
        addInbandEvents : addInbandEvents,
        clear : clear,
        start: start,
        setConfig: setConfig,
        reset : reset
    };

    return instance;
}

export default FactoryMaker.getSingletonFactory(EventController);