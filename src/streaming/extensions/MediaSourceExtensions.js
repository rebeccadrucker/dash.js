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
import FactoryMaker from '../../core/FactoryMaker.js';

function MediaSourceExtensions() {

    let instance;

    function createMediaSource() {

        var hasWebKit = ("WebKitMediaSource" in window);
        var hasMediaSource = ("MediaSource" in window);

        if (hasMediaSource) {
            return new MediaSource();
        } else if (hasWebKit) {
            return new WebKitMediaSource();
        }

        return null;
    }

    function attachMediaSource(source, videoModel) {

        var objectURL = window.URL.createObjectURL(source);

        videoModel.setSource(objectURL);

        return objectURL;
    }

    function detachMediaSource(videoModel) {
        // it seems that any value passed to the setSource is cast to a sting when setting element.src,
        // so we cannot use null or undefined to reset the element. Use empty string instead.
        videoModel.setSource("");
    }

    function setDuration(source, value) {

        if (source.duration != value)
            source.duration = value;

        return source.duration;
    }

    function signalEndOfStream(source) {

        var buffers = source.sourceBuffers;
        var ln = buffers.length;
        var i = 0;

        if (source.readyState !== "open") return;

        for (i; i < ln; i += 1) {
            if (buffers[i].updating) return;
        }

        source.endOfStream();
    }
    
    instance = {
        createMediaSource: createMediaSource,
        attachMediaSource: attachMediaSource,
        detachMediaSource: detachMediaSource,
        setDuration: setDuration,
        signalEndOfStream: signalEndOfStream
    };

    return instance;
}

export default FactoryMaker.getSingletonFactory(MediaSourceExtensions);