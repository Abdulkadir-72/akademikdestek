import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { MeteorObservable } from 'meteor-rxjs';
import { PaginationService } from 'ng2-pagination';
import { Counts } from 'meteor/tmeasday:publish-counts';
import { Options } from '../../../../both/models/options.model';
import { AccountsService } from '../../services/accounts.service';

import 'rxjs/add/operator/combineLatest';

import '../../../../both/methods/blog.methods.ts';

import { Blog } from '../../../../both/models/blog.model';
import { Blogs } from '../../../../both/collections/blogs.collection';

import template from './blog.component.html';
import style from './blog.component.scss';

@Component({
    selector: 'blog',
    template,
    styles: [ style ]
})
export class BlogComponent implements OnInit, OnDestroy {

    blogs: Observable<Blog[]>;
    blogsSub: Subscription;
    pageSize: Subject<number> = new Subject<number>();
    curPage: Subject<number> = new Subject<number>();
    optionsSub: Subscription;
    blogsSize: number = 0;
    autorunSub: Subscription;
    isAdmin: boolean = false;

    constructor(private paginationService: PaginationService,
                private accountsService: AccountsService) {

    }

    ngOnInit() {
        this.optionsSub = Observable.combineLatest(
            this.pageSize,
            this.curPage
        ).subscribe(([pageSize, curPage]) => {
            const options: Options = {
                limit: pageSize as number,
                skip: ((curPage as number) - 1) * (pageSize as number),
                sort: { createdAt: -1 }
            };

            this.paginationService.setCurrentPage(this.paginationService.defaultId(), curPage as number);

            if (this.blogsSub) {
                this.blogsSub.unsubscribe();
            }

            this.blogsSub = MeteorObservable.subscribe('blogs', options).subscribe(() => {

                // publication finished. check if logged in user is an admin
                this.isAdmin = this.accountsService.isAdmin(Meteor.userId());

                this.blogs = Blogs.find({}, {
                    sort: {
                        createdAt: -1
                    }
                }).zone();
            });
        });
        // build pagination service
        this.paginationService.register({
            id: this.paginationService.defaultId(),
            itemsPerPage: 5,
            currentPage: 1,
            totalItems: this.blogsSize
        });

        this.pageSize.next(5);
        this.curPage.next(1);

        this.autorunSub = MeteorObservable.autorun().subscribe(() => {
            this.blogsSize = Counts.get('numberOfBlogs');
            this.paginationService.setTotalItems(this.paginationService.defaultId(), this.blogsSize);
        });
    }

    onPageChanged(page: number): void {
        this.curPage.next(page);
    }

    deleteBlog(blog: Blog): void {
        // if there is a post to be deleted
        if (blog) {
            // delete it
            MeteorObservable.call('deleteBlog', blog._id, Meteor.userId()).subscribe(() => {

            }, (err) => {

            });
        }
    }

    ngOnDestroy() {
        this.blogsSub.unsubscribe();
        this.optionsSub.unsubscribe();
        this.autorunSub.unsubscribe();
    }

}